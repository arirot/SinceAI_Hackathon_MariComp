import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assessSufficiency, type Coverage } from '@/lib/finding-explanation';
import { cn } from '@/lib/utils';

const LABEL: Record<Coverage, string> = { READY: 'Verified measurement', NEEDS_VERIFICATION: 'Measured, awaiting verification', MISSING: 'Missing', TEXT_SCREEN: 'Text screening only' };
const TONE: Record<Coverage, string> = { READY: 'text-success', NEEDS_VERIFICATION: 'text-warning-foreground', MISSING: 'text-destructive', TEXT_SCREEN: 'text-muted-foreground' };
const VERDICT = { SUFFICIENT: 'Sufficient — every numeric clause has verified evidence', PARTIAL: 'Partial — some numeric clauses lack verified evidence', INSUFFICIENT: 'Insufficient — no numeric clause can be compared yet', TEXT_ONLY: 'Text-only rule set — findings will need engineer review' } as const;

/** Pre-assessment readiness check; informational only, never changes finding status. */
export function SufficiencyCheck({ versionId, sourceId }: { versionId: string; sourceId: string }) {
  const q = useQuery({ queryKey: ['sufficiency', versionId, sourceId], queryFn: async () => {
    const [reqs, interps] = await Promise.all([
      supabase.from('regulatory_requirements').select('id,clause_reference,category,deterministic_rule,required_evidence').eq('regulatory_source_id', sourceId).order('clause_reference'),
      supabase.from('design_interpretations').select('element_name,element_type,measured_value,unit,verification_status,information_origin,page_number').eq('design_version_id', versionId),
    ]);
    if (reqs.error) throw reqs.error; if (interps.error) throw interps.error;
    return assessSufficiency(reqs.data ?? [], interps.data ?? []);
  }});
  if (q.isPending) return <p className="text-sm text-muted-foreground">Checking document sufficiency…</p>;
  if (q.error || !q.data) return <p role="alert" className="text-sm">Sufficiency check could not be loaded.</p>;
  const s = q.data;
  return <section className="space-y-3 rounded-sm border bg-card p-4 sm:col-span-2">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="font-mono text-xs tracking-wider">DOCUMENT SUFFICIENCY</h3>
      <span className={cn('font-mono text-xs font-semibold', s.verdict === 'SUFFICIENT' ? 'text-success' : s.verdict === 'PARTIAL' ? 'text-warning-foreground' : 'text-destructive')}>{s.ready}/{s.numericCount} numeric clauses ready</span>
    </div>
    <p className="text-sm">{VERDICT[s.verdict]}. Pages interpreted: {s.processedPages.length ? s.processedPages.join(', ') : 'none — process and interpret the deck-plan sheets first'}.</p>
    <ul className="divide-y text-xs">{s.items.map((i) => <li key={i.requirementId} className="grid gap-1 py-1.5 sm:grid-cols-[7rem_1fr_auto]">
      <span className="font-mono">{i.clause}</span>
      <span>{i.category}{i.coverage === 'MISSING' && i.requiredEvidence.length > 0 && <span className="block text-muted-foreground">Needs: {i.requiredEvidence.join('; ')}</span>}{i.pages.length > 0 && <span className="block text-muted-foreground">Found on page {i.pages.join(', ')}</span>}</span>
      <span className={cn('font-mono', TONE[i.coverage])}>{LABEL[i.coverage]}{i.pending ? ` (${i.pending})` : ''}</span>
    </li>)}</ul>
    <p className="text-xs text-muted-foreground">You can still run the assessment; clauses without verified evidence will be reported as REQUIRES REVIEW.</p>
  </section>;
}
