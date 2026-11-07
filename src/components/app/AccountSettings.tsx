import { type FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAccount, useProfile, useRoles } from '@/lib/account';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag } from './Page';
import { OrganizationMembers } from './OrganizationMembers';

export function AccountSettings() {
  const { user } = useAccount();
  const profile = useProfile();
  const roles = useRoles();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!user) return;
    const data = new FormData(e.currentTarget); setBusy(true);
    const { error } = await supabase.from('profiles').update({ full_name: String(data.get('name')), organisation: String(data.get('org')) }).eq('id', user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { await queryClient.invalidateQueries({ queryKey: ['profile'] }); toast.success('Profile saved'); }
  }
  if (profile.isPending) return <p>Loading profile…</p>;
  if (profile.error) return <p role="alert">Your profile could not be loaded.</p>;
  return <div><div className="max-w-lg"><p className="mb-4 break-words text-sm">{user?.email}</p><div className="mb-6 flex gap-2">{roles.data?.map((r) => <Tag key={r}>{r.replace('_', ' ')}</Tag>)}</div><form key={profile.data.id} onSubmit={save} className="space-y-4"><div><Label htmlFor="profile-name">Full name</Label><Input id="profile-name" name="name" defaultValue={profile.data.full_name} required /></div><div><Label htmlFor="profile-org">Organisation</Label><Input id="profile-org" name="org" defaultValue={profile.data.organisation} /></div><Button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save profile'}</Button></form><p className="mt-6 text-xs text-muted-foreground">New accounts receive Engineer access. Administrator, Project Manager and Reviewer access requires an authorized assignment; editing your profile does not change organization membership.</p></div><OrganizationMembers /></div>;
}
