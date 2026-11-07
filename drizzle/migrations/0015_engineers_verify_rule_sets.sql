CREATE OR REPLACE FUNCTION public.adopt_verified_rule_set(_catalog_source_id uuid, _organization_id uuid, _rationale text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE src public.regulatory_sources; new_id uuid; n int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.organization_access(_organization_id, ARRAY['administrator','reviewer','engineer']::public.organization_role[]) THEN
    RAISE EXCEPTION 'Only organization administrators, reviewers or engineers may verify rule sets' USING ERRCODE='42501'; END IF;
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
END $function$;