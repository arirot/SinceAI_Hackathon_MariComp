import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const AccountContext = createContext<{ user: User | null; loading: boolean; recovery: boolean }>({ user: null, loading: true, recovery: false });

export function AccountProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [recovery, setRecovery] = useState(false);
  const account = useQuery({ queryKey: ['account'], queryFn: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') throw error;
    return data.user;
  }, retry: false });
  useEffect(() => {
    if (new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery') sessionStorage.setItem('maricomp-recovery', 'true');
    setRecovery(sessionStorage.getItem('maricomp-recovery') === 'true');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'PASSWORD_RECOVERY'].includes(event)) return;
      if (event === 'PASSWORD_RECOVERY') { sessionStorage.setItem('maricomp-recovery', 'true'); setRecovery(true); }
      if (event === 'SIGNED_OUT') { sessionStorage.removeItem('maricomp-recovery'); setRecovery(false); queryClient.clear(); queryClient.setQueryData(['account'], null); }
      else void queryClient.invalidateQueries();
      void router.invalidate();
    });
    return () => subscription.unsubscribe();
  }, [queryClient, router]);
  return <AccountContext.Provider value={{ user: account.data ?? null, loading: account.isPending, recovery }}>{children}</AccountContext.Provider>;
}

export const useAccount = () => useContext(AccountContext);

export function useProfile() {
  const { user } = useAccount();
  return useQuery({ queryKey: ['profile', user?.id], enabled: !!user, queryFn: async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user?.id ?? '').single();
    if (error) throw error;
    return data;
  }});
}

export function useRoles() {
  const { user } = useAccount();
  return useQuery({ queryKey: ['roles', user?.id], enabled: !!user, queryFn: async () => {
    const { data, error } = await supabase.from('organization_members').select('role,organization_id').eq('user_id', user?.id ?? '').eq('status', 'active');
    if (error) throw error;
    return [...new Set(data.map((row) => row.role))];
  }});
}

export function useMemberships() {
  const { user } = useAccount();
  return useQuery({ queryKey: ['memberships', user?.id], enabled: !!user, queryFn: async () => {
    const { data, error } = await supabase.from('organization_members').select('organization_id,role,organizations(name)').eq('user_id', user?.id ?? '').eq('status', 'active');
    if (error) throw error;
    return data;
  }});
}