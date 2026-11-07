import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/app/AppShell';
import { pageHead } from '@/lib/compliance';
import { useAccount } from '@/lib/account';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import '@lovable.dev/cloud-auth-js/styles.css';
import { safeDestination } from '@/lib/permissions';

export const Route = createFileRoute('/auth')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({ redirect: safeDestination(search['redirect']) }),
  head: () => pageHead('Sign in', 'Sign in or register for your private MariComp engineering workspace.'),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { user } = useAccount();
  const navigate = useNavigate();
  const redirect = safeDestination(Route.useSearch().redirect);
  useEffect(() => { if (user) void navigate({ to: redirect, replace: true }); }, [user, navigate, redirect]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    setBusy(true); setMessage('');
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMessage('Check your email for a password reset link.');
      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: String(form.get('name')), organisation: String(form.get('org')) } } });
        if (error) throw error;
        if (!data.session) setMessage('Check your email to confirm your account before signing in.');
        else await navigate({ to: redirect });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await navigate({ to: redirect, replace: true });
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to continue. Try again.'); }
    finally { setBusy(false); }
  }
  async function social(provider: 'google' | 'lovable') {
    setBusy(true); setMessage('');
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirect)}` });
      if (result.error) { setMessage(result.error.message); return; }
      if (!result.redirected) await navigate({ to: redirect, replace: true });
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Sign-in failed.'); }
    finally { setBusy(false); }
  }
  return <div className="blueprint-bg flex min-h-screen flex-col items-center justify-center p-4">
    <Logo className="mb-6" />
    <div className="w-full max-w-sm rounded-sm border bg-card p-6">
      <h1 className="mb-4 text-xl font-semibold">Engineering workspace</h1>
      <Tabs value={mode === 'forgot' ? 'signin' : mode} onValueChange={(value) => { setMode(value); setMessage(''); }}>
        <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="signin">Sign in</TabsTrigger><TabsTrigger value="register">Register</TabsTrigger></TabsList>
      </Tabs>
      <form method="post" onSubmit={submit} className="mt-4 space-y-3">
        {mode === 'register' && <><Field id="name" label="Full name" /><Field id="org" label="Organisation" /></>}
        <Field id="email" label="Work email" type="email" />
        {mode !== 'forgot' && <Field id="password" label="Password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}</Button>
      </form>
      <Button variant="link" size="sm" onClick={() => { setMode(mode === 'forgot' ? 'signin' : 'forgot'); setMessage(''); }}>{mode === 'forgot' ? 'Back to sign in' : 'Forgot password?'}</Button>
      {message && <p role="status" className="my-3 break-words text-sm">{message}</p>}
      <div className="mt-3 space-y-2 border-t pt-4">
        <Button variant="outline" className="google-auth-button w-full" disabled={busy} onClick={() => social('google')}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>Continue with Google
        </Button>
        <Button className="lovable-auth-button w-full" disabled={busy} onClick={() => social('lovable')}>Continue with Lovable</Button>
      </div>
      <Button asChild variant="ghost" className="mt-4 w-full"><Link to="/">Back to MariComp</Link></Button>
    </div>
  </div>;
}
function Field({ id, label, type = 'text', autoComplete }: { id: string; label: string; type?: string; autoComplete?: string }) {
  return <div className="space-y-1"><Label htmlFor={id} className="label-tech">{label}</Label><Input id={id} name={id} type={type} minLength={type === 'password' ? 8 : undefined} autoComplete={autoComplete ?? (type === 'email' ? 'email' : undefined)} required /></div>;
}
