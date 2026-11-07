CREATE OR REPLACE FUNCTION public.adopt_verified_rule_set(_catalog_source_id uuid, _organization_id uuid, _rationale text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE src public.regulatory_sources; new_id uuid; n int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.organization_access(_organization_id, ARRAY['administrator','reviewer']::public.organization_role[]) THEN
    RAISE EXCEPTION 'Only organization administrators or reviewers may verify rule sets' USING ERRCODE='42501'; END IF;
  IF length(trim(coalesce(_rationale,''))) < 20 THEN RAISE EXCEPTION 'A verification rationale of at least 20 characters is required'; END IF;
  SELECT * INTO src FROM public.regulatory_sources WHERE id=_catalog_source_id AND library_catalog AND organization_id IS NULL;
  IF src.id IS NULL THEN RAISE EXCEPTION 'Catalog regulation not found'; END IF;
  IF EXISTS(SELECT 1 FROM public.regulatory_sources WHERE organization_id=_organization_id AND rule_set_key=src.rule_set_key AND rule_set_version=src.rule_set_version AND status='verified') THEN
    RAISE EXCEPTION 'This regulation edition is already verified for the organization'; END IF;
  INSERT INTO public.regulatory_sources(organization_id,publisher,title,rule_set_key,rule_set_version,source_url,status,regulation_number,legal_version,legal_version_date,celex_id,library_catalog,version_note,imported_at)
  VALUES(_organization_id,src.publisher,src.title,src.rule_set_key,src.rule_set_version,src.source_url,'draft',src.regulation_number,src.legal_version,src.legal_version_date,src.celex_id,false,
    'Organization-verified copy of catalog record '||src.id||'. Rationale: '||trim(_rationale),src.imported_at) RETURNING id INTO new_id;
  INSERT INTO public.regulatory_requirements(regulatory_source_id,rule_set_version,clause_reference,requirement_text,category,applicability,deterministic_rule,status,article_reference,annex_reference,required_evidence,verification_status,wording_sha256,imported_at)
  SELECT new_id,r.rule_set_version,r.clause_reference,r.requirement_text,r.category,r.applicability,r.deterministic_rule,'active',r.article_reference,r.annex_reference,r.required_evidence,'VERIFIED',r.wording_sha256,r.imported_at
  FROM public.regulatory_requirements r WHERE r.regulatory_source_id=src.id AND r.status<>'retired';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'Catalog regulation has no requirements to verify'; END IF;
  UPDATE public.regulatory_sources SET status='verified',verified_by=auth.uid(),verified_at=now(),published_at=now() WHERE id=new_id;
  INSERT INTO public.activity_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
  VALUES(_organization_id,auth.uid(),'rule_set_verified','regulatory_source',new_id,jsonb_build_object('catalog_source_id',src.id,'celex_id',src.celex_id,'requirements',n,'rationale',trim(_rationale)));
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.adopt_verified_rule_set(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adopt_verified_rule_set(uuid,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.run_compliance_assessment(_assessment_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.compliance_assessments; req record; fid uuid; phrase text; el record; found int; total int := 0; ev_terms text[];
BEGIN
  SELECT * INTO a FROM public.compliance_assessments WHERE id=_assessment_id FOR UPDATE;
  IF a.id IS NULL OR auth.uid() IS NULL OR NOT public.project_access(a.project_id, ARRAY['administrator','project_manager','engineer']::public.organization_role[]) THEN
    RAISE EXCEPTION 'Assessment not authorized' USING ERRCODE='42501'; END IF;
  IF a.status <> 'queued' THEN RAISE EXCEPTION 'Only queued assessments can be run'; END IF;
  UPDATE public.compliance_assessments SET status='running',started_at=now(),engine_version='evidence-screen-1' WHERE id=a.id;
  FOR req IN SELECT * FROM public.regulatory_requirements WHERE regulatory_source_id=a.regulatory_source_id AND rule_set_version=a.rule_set_version AND status='active' AND verification_status='VERIFIED' ORDER BY clause_reference LOOP
    SELECT coalesce(array_agg(value),'{}') INTO ev_terms FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(req.required_evidence)='array' THEN req.required_evidence ELSE '[]'::jsonb END);
    INSERT INTO public.compliance_findings(assessment_id,project_id,regulatory_requirement_id,regulatory_source_id,rule_set_version,title,deterministic_status,severity,review_status,recommendation,engine_version)
    VALUES(a.id,a.project_id,req.id,a.regulatory_source_id,a.rule_set_version,req.clause_reference||' · '||req.category,'REQUIRES_REVIEW','medium','open','placeholder','evidence-screen-1') RETURNING id INTO fid;
    found := 0;
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
    total := total + 1;
  END LOOP;
  UPDATE public.compliance_assessments SET status='requires_review',overall_status='REQUIRES_REVIEW',completed_at=now() WHERE id=a.id;
  RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.run_compliance_assessment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_compliance_assessment(uuid) TO authenticated;