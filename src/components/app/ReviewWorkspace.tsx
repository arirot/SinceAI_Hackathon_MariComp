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

export function ReviewWorkspace() {
  const { user } = useAccount();
  const memberships = useMemberships();
  const engineering = useEngineering();
  const data = engineering.data;
  const allowed = new Set(memberships.data?.filter((m) => permits(m.role, 'review')).map((m) => m.organization_id));
  const [selected, setSelected] = useState('');
  const finding = data?.findings.find((f) => f.id === selected);
  const source = data?.sources.find((s) => s.id === finding?.regulatory_source_id);
  const canReview = finding && data?.projects.some((p) => p.id === finding.project_id && allowed.has(p.organization_id));
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  async function decide(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !finding || !canReview) return;
    const form = new FormData(e.currentTarget);
    const decision = String(form.get('decision'));
    setBusy(true);
    const result = await supabase.from('engineering_reviews').insert({ project_id: finding.project_id, assessment_id: finding.assessment_id, finding_id: finding.id, reviewer_id: user.id, decision, rationale: String(form.get('rationale')).trim() });
    setBusy(false);
    if (result.error) toast.error(result.error.message);
    else { await queryClient.invalidateQueries({ queryKey: ['engineering'] }); toast.success('Review recorded'); setSelected(''); }
  }
  return <>
    {engineering.error && <p role="alert">Findings could not be loaded.</p>}
    <DataTable rows={data?.findings ?? []} rowKey={(f) => f.id} empty={engineering.isPending ? 'Loading findings…' : 'Review queue is empty.'} columns={[
      { label: 'Finding', cell: (f) => <Button variant="link" className="h-auto whitespace-normal p-0 text-left" onClick={() => setSelected(f.id)}>{f.title}</Button> },
      { label: 'Requirement', cell: (f) => f.regulatory_requirements.clause_reference },
      { label: 'Status', cell: (f) => <StatusBadge status={f.deterministic_status === 'COMPLIANT' ? 'COMPLIANT' : f.deterministic_status === 'NON_COMPLIANT' ? 'NON_COMPLIANT' : 'REQUIRES_REVIEW'} /> },
      { label: 'Review', cell: (f) => f.review_status },
    ]} />
    {finding && <section className="mt-6 border-t pt-4"><h2 className="text-lg font-semibold">{finding.title}</h2><p className="mt-2 text-sm">{finding.regulatory_requirements.requirement_text}</p>{source && <a href={source.source_url} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-primary underline">{source.title} · {finding.regulatory_requirements.clause_reference}</a>}<p className="mt-2 text-sm">{finding.interpretation}</p><p className="mt-2 text-sm">{finding.recommendation}</p><h3 className="label-tech mt-4">Evidence</h3>{data?.evidence.filter((e) => e.finding_id === finding.id).map((e, i) => <p key={i} className="mt-2 text-sm">Page {e.page_number ?? '—'} · {e.source_quote} · {e.verified ? 'Verified' : 'Unverified'}</p>)}
      {canReview && <form onSubmit={decide} className="mt-4 max-w-xl space-y-3"><div><Label htmlFor="review-decision">Decision</Label><select id="review-decision" name="decision" className="mt-1 h-9 w-full rounded-sm border bg-card px-3 text-sm"><option value="accept">Approve finding</option><option value="request_changes">Request changes</option><option value="override">Override finding</option></select></div><div><Label htmlFor="review-rationale">Engineering rationale</Label><textarea id="review-rationale" name="rationale" required minLength={1} className="mt-1 min-h-24 w-full rounded-sm border bg-card p-3 text-sm" /></div><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Record review'}</Button></form>}
    </section>}
  </>;
}