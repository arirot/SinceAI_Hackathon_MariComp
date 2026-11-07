import { type FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAccount, useMemberships } from '@/lib/account';
import { useEngineering } from '@/lib/engineering';
import { permits } from '@/lib/permissions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DataTable, StatusBadge } from './Page';
import { SufficiencyCheck } from './SufficiencyCheck';

export function AssessmentWorkspace() {
  const { user } = useAccount();
  const memberships = useMemberships();
  const engineering = useEngineering();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState({ version: '', source: '' });
  const data = engineering.data;
  const allowed = new Set(memberships.data?.filter((m) => permits(m.role, 'engineer')).map((m) => m.organization_id));
  const versions = data?.versions.filter((v) => data.projects.some((p) => p.id === v.project_id && allowed.has(p.organization_id))) ?? [];
  async function request(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !data) return;
    const form = new FormData(e.currentTarget);
    const version = versions.find((v) => v.id === form.get('version'));
    const source = data.sources.find((s) => s.id === form.get('source') && s.status === 'verified');
    if (!version || !source) return;
    setBusy(true);
    const result = await supabase.from('compliance_assessments').insert({ project_id: version.project_id, design_version_id: version.id, regulatory_source_id: source.id, rule_set_version: source.rule_set_version, requested_by: user.id }).select('id').single();
    if (result.error) { setBusy(false); toast.error(result.error.message); return; }
    const run = await supabase.rpc('run_compliance_assessment', { _assessment_id: result.data.id });
    setBusy(false);
    await queryClient.invalidateQueries({ queryKey: ['engineering'] });
    if (run.error) toast.error(`Assessment queued but could not run: ${run.error.message}`);
    else toast.success(`Assessment complete: ${run.data} findings evaluated. See Findings for measured vs required values.`);
  }
  return <>
    {engineering.error && <p role="alert">Assessments could not be loaded.</p>}
    {allowed.size > 0 && <form onSubmit={request} className="mb-6 grid gap-3 border-b pb-6 sm:grid-cols-2">
      <div><Label htmlFor="assessment-version">Design version</Label><select id="assessment-version" name="version" required onChange={(e) => setSel((s) => ({ ...s, version: e.target.value }))} className="mt-1 h-9 w-full rounded-sm border bg-card px-3 text-sm"><option value="">Select design version</option>{versions.map((v) => <option key={v.id} value={v.id}>{v.design_documents.title} · Rev {v.revision} · v{v.version_number}</option>)}</select></div>
      <div><Label htmlFor="assessment-source">Verified rule set</Label><select id="assessment-source" name="source" required onChange={(e) => setSel((s) => ({ ...s, source: e.target.value }))} className="mt-1 h-9 w-full rounded-sm border bg-card px-3 text-sm"><option value="">Select verified rule set</option>{data?.sources.filter((s) => s.status === 'verified').map((s) => <option key={s.id} value={s.id}>{s.title} · {s.rule_set_version}</option>)}</select></div>
      {sel.version && sel.source && <SufficiencyCheck versionId={sel.version} sourceId={sel.source} />}
      <Button type="submit" disabled={busy || !versions.length || !data?.sources.length} className="justify-self-start">{busy ? 'Running…' : 'Run assessment'}</Button>
    </form>}
    {allowed.size > 0 && !data?.sources.some((s) => s.status === 'verified') && <p className="mb-6 text-sm text-muted-foreground">No verified rule set yet. An administrator, reviewer or engineer can verify a regulation on the Regulations page.</p>}
    <DataTable rows={data?.assessments ?? []} rowKey={(a) => a.id} empty={engineering.isPending ? 'Loading assessments…' : 'No assessments.'} columns={[
      { label: 'Project', cell: (a) => data?.projects.find((p) => p.id === a.project_id)?.name ?? a.project_id },
      { label: 'Design version', cell: (a) => { const v = data?.versions.find((v) => v.id === a.design_version_id); return v ? `${v.design_documents.title} · Rev ${v.revision}` : a.design_version_id; } },
      { label: 'Rule set', cell: (a) => `${data?.sources.find((s) => s.id === a.regulatory_source_id)?.title ?? a.regulatory_source_id} · ${a.rule_set_version}` },
      { label: 'State', cell: (a) => a.status },
      { label: 'Outcome', cell: (a) => <StatusBadge status={a.overall_status === 'COMPLIANT' ? 'COMPLIANT' : a.overall_status === 'NON_COMPLIANT' ? 'NON_COMPLIANT' : 'REQUIRES_REVIEW'} /> },
    ]} />
  </>;
}