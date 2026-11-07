import { useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { pageHead } from '@/lib/compliance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccount } from '@/lib/account';

export const Route = createFileRoute('/reset-password')({ head: () => pageHead('Reset password', 'Set a new password for your MariComp account using a secure recovery link.'), component: ResetPassword });
function ResetPassword() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { user, loading, recovery } = useAccount();
  const navigate = useNavigate();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!recovery || !user) return;
    const data = new FormData(e.currentTarget);
    if (data.get('password') !== data.get('confirm')) { setMessage('Passwords do not match.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: String(data.get('password')) });
    setBusy(false);
    if (error) setMessage(error.message);
    else { sessionStorage.removeItem('maricomp-recovery'); setMessage('Password updated.'); await navigate({ to: '/dashboard', replace: true }); }
  }
  return <div className="blueprint-bg flex min-h-screen items-center justify-center p-4"><div className="w-full max-w-sm border bg-card p-6"><h1 className="mb-4 text-xl font-semibold">Reset password</h1>{loading ? <p>Checking recovery link…</p> : recovery && user ? <form onSubmit={submit} className="space-y-3"><Label htmlFor="new-password">New password</Label><Input id="new-password" name="password" type="password" minLength={8} autoComplete="new-password" required /><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" name="confirm" type="password" minLength={8} autoComplete="new-password" required /><Button disabled={busy} type="submit">{busy ? 'Saving…' : 'Update password'}</Button></form> : <p>This recovery link is missing or expired. Request a new link from sign in.</p>}{message && <p role="status" className="mt-3 text-sm">{message}</p>}<Button asChild variant="link"><Link to="/auth">Back to sign in</Link></Button></div></div>;
}
