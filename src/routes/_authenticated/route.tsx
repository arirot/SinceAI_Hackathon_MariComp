// Open-access layout: visitors without a session are signed in as the shared guest account.
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { signInAsGuest } from '@/lib/guest-access';

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return;
    const guest = await signInAsGuest();
    if (!guest) throw redirect({ to: '/auth', search: { redirect: location.href }, replace: true });
  },
  component: Outlet,
});
