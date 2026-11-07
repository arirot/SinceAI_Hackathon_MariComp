CREATE OR REPLACE FUNCTION public.length_is_imperial(_unit text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT lower(trim(coalesce(_unit,''))) IN ('in','inch','inches','"','ft','feet','foot','''') $$;
REVOKE ALL ON FUNCTION public.length_is_imperial(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.length_is_imperial(text) TO authenticated, service_role;
DO $do$
DECLARE src text;
BEGIN
  src := pg_get_functiondef('public.run_compliance_assessment(uuid)'::regprocedure);
  src := replace(src, 'ok := CASE WHEN op=''>='' THEN mm >= thr ELSE mm <= thr END;',
    'ok := CASE WHEN public.length_is_imperial(el.unit) AND r ? ''threshold_in'' THEN (CASE WHEN op=''>='' THEN mm/25.4 >= (r->>''threshold_in'')::numeric ELSE mm/25.4 <= (r->>''threshold_in'')::numeric END) ELSE (CASE WHEN op=''>='' THEN mm >= thr ELSE mm <= thr END) END;');
  IF position('length_is_imperial' in src)=0 THEN RAISE EXCEPTION 'engine patch failed'; END IF;
  EXECUTE src;
END $do$;