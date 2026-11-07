import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { useAccount, useMemberships } from '@/lib/account';
import { changeMember } from '@/lib/members.functions';
import { permits, type OrganizationRole } from '@/lib/permissions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, Tag } from './Page';

export function OrganizationMembers() {
  const { user } = useAccount();
  const memberships = useMemberships();
  const [selected, setSelected] = useState('');
  const organization = memberships.data?.find((m) => m.organization_id === selected) ?? memberships.data?.[0];
  const organizationId = organization?.organization_id;
  const canManage = organization ? permits(organization.role, 'manage_members') : false;
  const queryClient = useQueryClient();
  const change = useServerFn(changeMember);
  const [busy, setBusy] = useState(false);
  const members = useQuery({ queryKey: ['organization-members', organizationId], enabled: !!organizationId, queryFn: async () => {
    if (!organizationId) return [];
    const { data, error } = await supabase.rpc('list_organization_members', { _organization_id: organizationId });
    if (error) throw error;
    return data;
  }});
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage || !organizationId) return;
    const data = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await change({ data: { organizationId, userId: String(data.get('userId')).trim(), role: String(data.get('role')) as OrganizationRole, status: data.get('status') === 'suspended' ? 'suspended' : 'active' } });
      await queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      await queryClient.invalidateQueries({ queryKey: ['memberships'] });
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Membership saved');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Membership could not be saved.'); }
    finally { setBusy(false); }
  }
  return <section className="mt-8 border-t pt-6">
    <h2 className="mb-4 text-lg font-semibold">Organization members</h2>
    <div className="mb-4"><Label htmlFor="membership-organization">Organization</Label><select id="membership-organization" className="mt-1 h-9 w-full max-w-lg rounded-sm border bg-card px-3 text-sm" value={organizationId ?? ''} onChange={(e) => setSelected(e.target.value)}>{memberships.data?.map((m) => <option key={m.organization_id} value={m.organization_id}>{m.organizations.name}</option>)}</select></div>
    <p className="mb-4 break-all font-mono text-xs">Your account ID: {user?.id}</p>
    {members.error && <p role="alert" className="mb-3 text-destructive">Members could not be loaded.</p>}
    <DataTable rows={members.data ?? []} rowKey={(m) => m.id} empty={members.isPending && organizationId ? 'Loading members…' : 'No members.'} columns={[
      { label: 'Name', cell: (m) => m.full_name || 'Unnamed account' },
      { label: 'Account ID', cell: (m) => <span className="font-mono text-xs">{m.user_id}</span> },
      { label: 'Role', cell: (m) => <Tag>{m.role.replace('_', ' ')}</Tag> },
      { label: 'Status', cell: (m) => m.status },
    ]} />
    {canManage && <form onSubmit={save} className="mt-5 grid max-w-2xl gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label htmlFor="member-id">Member account ID</Label><Input id="member-id" name="userId" required placeholder="Existing account ID" /></div>
      <div><Label htmlFor="member-role">Role</Label><select id="member-role" name="role" className="mt-1 h-9 w-full rounded-sm border bg-card px-3 text-sm">{(['engineer','reviewer','project_manager','administrator'] as const).map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}</select></div>
      <div><Label htmlFor="member-status">Status</Label><select id="member-status" name="status" className="mt-1 h-9 w-full rounded-sm border bg-card px-3 text-sm"><option value="active">Active</option><option value="suspended">Suspended</option></select></div>
      <Button className="justify-self-start" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save membership'}</Button>
    </form>}
  </section>;
}