REVOKE EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_account_profile() FROM anon,authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated;