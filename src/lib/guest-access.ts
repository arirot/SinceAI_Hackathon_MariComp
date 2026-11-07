import { supabase } from '@/integrations/supabase/client';

// Shared guest account so anyone with the link can use the workspace without signing in.
export const GUEST_EMAIL = 'guest@maricomp.demo';
const GUEST_PASSWORD = 'MariCompGuest2026!';

export async function signInAsGuest() {
  const { data, error } = await supabase.auth.signInWithPassword({ email: GUEST_EMAIL, password: GUEST_PASSWORD });
  return error ? null : data.user;
}
