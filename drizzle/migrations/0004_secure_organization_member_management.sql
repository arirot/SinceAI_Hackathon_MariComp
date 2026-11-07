CREATE OR REPLACE FUNCTION public.manage_organization_member(_organization_id uuid, _user_id uuid, _role public.organization_role, _status text DEFAULT 'active') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE member_id uuid; old_role public.organization_role; old_status text; BEGIN
PERFORM 1 FROM public.organizations WHERE id=_organization_id FOR UPDATE;
IF auth.uid() IS NULL OR NOT public.organization_access(_organization_id,ARRAY['administrator']::public.organization_role[]) THEN RAISE EXCEPTION 'Administrator membership required' USING ERRCODE='42501'; END IF;
IF _status IS NULL OR _status NOT IN ('active','suspended') OR _role IS NULL THEN RAISE EXCEPTION 'Invalid membership'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_user_id) THEN RAISE EXCEPTION 'Account not found'; END IF;
SELECT role,status INTO old_role,old_status FROM public.organization_members WHERE organization_id=_organization_id AND user_id=_user_id;
IF old_role='administrator' AND old_status='active' AND (_role<>'administrator' OR _status<>'active') AND NOT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=_organization_id AND user_id<>_user_id AND role='administrator' AND status='active') THEN RAISE EXCEPTION 'Keep at least one active administrator'; END IF;
INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES(_organization_id,_user_id,_role,_status) ON CONFLICT(organization_id,user_id) DO UPDATE SET role=EXCLUDED.role,status=EXCLUDED.status RETURNING id INTO member_id;
INSERT INTO public.activity_logs(organization_id,actor_id,action,entity_type,entity_id,metadata) VALUES(_organization_id,auth.uid(),'membership_changed','organization_members',member_id,jsonb_build_object('user_id',_user_id,'previous_role',old_role,'previous_status',old_status,'role',_role,'status',_status));
RETURN member_id; END $$;
REVOKE ALL ON FUNCTION public.manage_organization_member(uuid,uuid,public.organization_role,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_organization_member(uuid,uuid,public.organization_role,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.list_organization_members(_organization_id uuid) RETURNS TABLE(id uuid,user_id uuid,full_name text,role public.organization_role,status text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL OR NOT public.organization_access(_organization_id) THEN RAISE EXCEPTION 'Organization membership required' USING ERRCODE='42501'; END IF;
RETURN QUERY SELECT m.id,m.user_id,p.full_name,m.role,m.status FROM public.organization_members m JOIN public.profiles p ON p.id=m.user_id WHERE m.organization_id=_organization_id ORDER BY p.full_name,m.id; END $$;
REVOKE ALL ON FUNCTION public.list_organization_members(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_organization_members(uuid) TO authenticated,service_role;
COMMENT ON FUNCTION public.manage_organization_member(uuid,uuid,public.organization_role,text) IS 'Narrow administrator-only membership changes; serialized last-administrator guard and immutable activity log. No direct table write grants.';