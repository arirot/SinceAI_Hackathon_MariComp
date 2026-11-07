ALTER TABLE public.design_interpretations ADD COLUMN region jsonb;
COMMENT ON COLUMN public.design_interpretations.region IS 'Optional normalized page region {x,y,w,h} (0-1) locating the element for drawing highlights; never used to derive dimensions.';
ALTER TABLE public.assessment_evidence ADD COLUMN design_interpretation_id uuid REFERENCES public.design_interpretations(id), ADD COLUMN measured_value numeric, ADD COLUMN measured_unit text, ADD COLUMN measured_mm numeric, ADD COLUMN threshold jsonb, ADD COLUMN rule_outcome text CHECK (rule_outcome IS NULL OR rule_outcome IN ('pass','fail'));

CREATE OR REPLACE FUNCTION public.length_to_mm(_value numeric, _unit text) RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE lower(trim(coalesce(_unit,'')))
  WHEN 'mm' THEN _value WHEN 'millimetre' THEN _value WHEN 'millimeter' THEN _value WHEN 'millimetres' THEN _value WHEN 'millimeters' THEN _value
  WHEN 'cm' THEN _value*10 WHEN 'm' THEN _value*1000 WHEN 'metre' THEN _value*1000 WHEN 'meter' THEN _value*1000
  WHEN 'in' THEN _value*25.4 WHEN 'inch' THEN _value*25.4 WHEN 'inches' THEN _value*25.4 WHEN '"' THEN _value*25.4
  WHEN 'ft' THEN _value*304.8 WHEN 'feet' THEN _value*304.8 WHEN 'foot' THEN _value*304.8 WHEN '''' THEN _value*304.8
  ELSE NULL END $$;

CREATE OR REPLACE FUNCTION public.run_compliance_assessment(_assessment_id uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE a public.compliance_assessments; req record; fid uuid; phrase text; el record; found int; total int := 0; ev_terms text[]; r jsonb; terms text[]; thr numeric; op text; passed int; failed int; st text; rec text; mm numeric; ok boolean; overall text := 'COMPLIANT';
BEGIN
  SELECT * INTO a FROM public.compliance_assessments WHERE id=_assessment_id FOR UPDATE;
  IF a.id IS NULL OR auth.uid() IS NULL OR NOT public.project_access(a.project_id, ARRAY['administrator','project_manager','engineer']::public.organization_role[]) THEN
    RAISE EXCEPTION 'Assessment not authorized' USING ERRCODE='42501'; END IF;
  IF a.status <> 'queued' THEN RAISE EXCEPTION 'Only queued assessments can be run'; END IF;
  UPDATE public.compliance_assessments SET status='running',started_at=now(),engine_version='quantitative-1' WHERE id=a.id;
  FOR req IN SELECT * FROM public.regulatory_requirements WHERE regulatory_source_id=a.regulatory_source_id AND rule_set_version=a.rule_set_version AND status='active' AND verification_status='VERIFIED' ORDER BY clause_reference LOOP
    SELECT coalesce(array_agg(value),'{}') INTO ev_terms FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(req.required_evidence)='array' THEN req.required_evidence ELSE '[]'::jsonb END);
    r := req.deterministic_rule;
    INSERT INTO public.compliance_findings(assessment_id,project_id,regulatory_requirement_id,regulatory_source_id,rule_set_version,title,deterministic_status,severity,review_status,recommendation,engine_version)
    VALUES(a.id,a.project_id,req.id,a.regulatory_source_id,a.rule_set_version,req.clause_reference||' · '||req.category,'REQUIRES_REVIEW','medium','open','placeholder','quantitative-1') RETURNING id INTO fid;
    IF coalesce(r->>'type','')='numeric' AND (r->>'unit')='mm' AND (r->>'operator') IN ('>=','<=') THEN
      thr := (r->>'threshold')::numeric; op := r->>'operator'; passed := 0; failed := 0;
      SELECT coalesce(array_agg(lower(value)),'{}') INTO terms FROM jsonb_array_elements_text(coalesce(r->'match','[]'::jsonb));
      FOR el IN SELECT i.* FROM public.design_interpretations i WHERE i.design_version_id=a.design_version_id AND i.project_id=a.project_id
          AND i.verification_status='VERIFIED' AND i.information_origin='DIRECTLY_OBSERVED' AND i.measured_value IS NOT NULL
          AND EXISTS(SELECT 1 FROM unnest(terms) t WHERE lower(i.element_type||' '||i.element_name) LIKE '%'||t||'%') ORDER BY i.page_number, i.element_name LIMIT 50 LOOP
        mm := public.length_to_mm(el.measured_value, el.unit);
        IF mm IS NULL THEN CONTINUE; END IF;
        ok := CASE WHEN op='>=' THEN mm >= thr ELSE mm <= thr END;
        IF ok THEN passed := passed+1; ELSE failed := failed+1; END IF;
        INSERT INTO public.assessment_evidence(project_id,assessment_id,design_version_id,finding_id,design_interpretation_id,page_number,source_quote,verified,verified_by,verified_at,measured_value,measured_unit,measured_mm,threshold,rule_outcome)
        VALUES(a.project_id,a.id,a.design_version_id,fid,el.id,el.page_number,left(coalesce(nullif(trim(el.source_quote),''),el.element_name),1000),true,el.reviewed_by,el.reviewed_at,el.measured_value,el.unit,round(mm,1),r,CASE WHEN ok THEN 'pass' ELSE 'fail' END);
      END LOOP;
      IF failed>0 THEN st:='NON_COMPLIANT'; rec:=failed||' engineer-verified measurement(s) breach '||op||' '||(r->>'source_threshold')||'; '||passed||' satisfy it. Correct the design or document a justified exception.';
      ELSIF passed>0 THEN st:='COMPLIANT'; rec:=passed||' engineer-verified measurement(s) satisfy '||op||' '||(r->>'source_threshold')||'. Applicability and completeness still require engineer confirmation.';
      ELSE st:='REQUIRES_REVIEW'; rec:='Missing evidence: no engineer-verified, directly observed measurement for '||array_to_string(terms,'/')||' was found in this design version. Interpret and verify the dimension on the drawing.'; END IF;
      UPDATE public.compliance_findings SET deterministic_status=st, severity=CASE WHEN st='NON_COMPLIANT' THEN 'high' ELSE 'medium' END, recommendation=rec WHERE id=fid;
    ELSE
      st := 'REQUIRES_REVIEW'; found := 0;
      FOREACH phrase IN ARRAY ev_terms LOOP
        FOR el IN SELECT id,page_number,coalesce(corrected_text,extracted_text,source_quote) txt FROM public.extracted_design_elements
          WHERE design_version_id=a.design_version_id AND project_id=a.project_id AND coalesce(corrected_text,extracted_text,source_quote,'') ILIKE '%'||phrase||'%' LIMIT 2 LOOP
          IF found < 5 AND length(trim(coalesce(el.txt,'')))>0 THEN
            INSERT INTO public.assessment_evidence(project_id,assessment_id,design_version_id,finding_id,extracted_element_id,page_number,source_quote,verified)
            VALUES(a.project_id,a.id,a.design_version_id,fid,el.id,el.page_number,left(el.txt,1000),false);
            found := found + 1;
          END IF;
        END LOOP;
      END LOOP;
      UPDATE public.compliance_findings SET recommendation = CASE WHEN found=0
        THEN 'Missing evidence: no extracted text in this design version matches the required evidence ('||array_to_string(ev_terms,'; ')||'). Provide the documents and have an engineer review.'
        ELSE found||' candidate evidence passage(s) matched by text search. An engineer must confirm they satisfy: '||array_to_string(ev_terms,'; ')||'.' END WHERE id=fid;
    END IF;
    IF st='NON_COMPLIANT' THEN overall:='NON_COMPLIANT'; ELSIF st<>'COMPLIANT' AND overall<>'NON_COMPLIANT' THEN overall:='REQUIRES_REVIEW'; END IF;
    total := total + 1;
  END LOOP;
  IF total=0 THEN overall:='REQUIRES_REVIEW'; END IF;
  UPDATE public.compliance_assessments SET status=CASE WHEN overall='COMPLIANT' THEN 'completed' ELSE 'requires_review' END,overall_status=overall,completed_at=now() WHERE id=a.id;
  RETURN total;
END $function$;
REVOKE ALL ON FUNCTION public.length_to_mm(numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.length_to_mm(numeric,text) TO authenticated, service_role;