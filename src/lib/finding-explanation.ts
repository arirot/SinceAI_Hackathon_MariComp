/**
 * Deterministic engineering explanations and document-sufficiency checks.
 * Built only from stored records (verified clause thresholds + engineer-verified
 * measurements). Never sets compliance status and never invents values.
 */
import { lengthToMm, type NumericRule } from './quantitative-rules';

export interface ReqLite { id: string; clause_reference: string; category: string; deterministic_rule: unknown; required_evidence: unknown }
export interface InterpLite { element_name: string; element_type: string; measured_value: number | null; unit: string | null; verification_status: string; information_origin: string; page_number: number }
export interface EvidenceLite { element_name?: string | null | undefined; measured_value: number | null; measured_unit: string | null; measured_mm: number | null; rule_outcome: string | null; page_number: number | null; threshold: unknown }

export function numericRule(r: unknown): NumericRule | null {
  const x = r as Partial<NumericRule> | null;
  return x && x.type === 'numeric' && typeof x.threshold === 'number' && Array.isArray(x.match) ? (x as NumericRule) : null;
}
export function evidenceList(r: unknown): string[] { return Array.isArray(r) ? r.filter((x): x is string => typeof x === 'string') : []; }

const matches = (rule: NumericRule, i: InterpLite) => { const n = `${i.element_name} ${i.element_type}`.toLowerCase(); return rule.match.some((m) => n.includes(m.toLowerCase())); };

export type Coverage = 'READY' | 'NEEDS_VERIFICATION' | 'MISSING' | 'TEXT_SCREEN';
export interface RequirementCoverage { requirementId: string; clause: string; category: string; coverage: Coverage; usable: number; pending: number; pages: number[]; requiredEvidence: string[] }

/** Per requirement: is there an engineer-verified, directly observed, convertible measurement for it? */
export function assessSufficiency(reqs: ReqLite[], interps: InterpLite[]) {
  const items: RequirementCoverage[] = reqs.map((r) => {
    const rule = numericRule(r.deterministic_rule);
    const base = { requirementId: r.id, clause: r.clause_reference, category: r.category, requiredEvidence: evidenceList(r.required_evidence) };
    if (!rule) return { ...base, coverage: 'TEXT_SCREEN', usable: 0, pending: 0, pages: [] };
    const measured = interps.filter((i) => matches(rule, i) && i.measured_value != null && lengthToMm(i.measured_value, i.unit) !== null && i.information_origin === 'DIRECTLY_OBSERVED');
    const usable = measured.filter((i) => i.verification_status === 'VERIFIED');
    const pending = measured.filter((i) => i.verification_status === 'UNVERIFIED');
    const coverage: Coverage = usable.length ? 'READY' : pending.length ? 'NEEDS_VERIFICATION' : 'MISSING';
    return { ...base, coverage, usable: usable.length, pending: pending.length, pages: [...new Set(measured.map((i) => i.page_number))].sort((a, b) => a - b) };
  });
  const numeric = items.filter((i) => i.coverage !== 'TEXT_SCREEN');
  const ready = numeric.filter((i) => i.coverage === 'READY').length;
  const processedPages = [...new Set(interps.map((i) => i.page_number))].sort((a, b) => a - b);
  const verdict = numeric.length === 0 ? 'TEXT_ONLY' : ready === numeric.length ? 'SUFFICIENT' : ready > 0 ? 'PARTIAL' : 'INSUFFICIENT';
  return { items, numericCount: numeric.length, ready, processedPages, verdict } as const;
}

const fmt = (mm: number) => (Math.abs(mm) >= 1000 ? `${(mm / 1000).toFixed(3)} m` : `${Math.round(mm)} mm`);

/** Root cause + remedy for one finding, derived only from stored evidence. */
export function explainFinding(status: string, req: Pick<ReqLite, 'clause_reference' | 'category' | 'deterministic_rule' | 'required_evidence'> | null, evidence: EvidenceLite[]) {
  const rule = req ? numericRule(req.deterministic_rule) : null;
  const measured = evidence.filter((e) => e.rule_outcome && e.measured_mm != null);
  const fails = measured.filter((e) => e.rule_outcome === 'fail');
  const need = evidenceList(req?.required_evidence);
  if (rule && fails.length) {
    const worst = fails.reduce((a, b) => (Math.abs(Number(a.measured_mm) - rule.threshold) > Math.abs(Number(b.measured_mm) - rule.threshold) ? a : b));
    const gap = Math.abs(Number(worst.measured_mm) - rule.threshold);
    const word = rule.operator === '>=' ? 'minimum' : 'maximum';
    return {
      rootCause: `${worst.element_name ?? 'Element'} measures ${worst.measured_value} ${worst.measured_unit ?? ''} (${fmt(Number(worst.measured_mm))}) against the ${word} ${rule.source_threshold} in ${req!.clause_reference}, a ${fmt(gap)} ${rule.operator === '>=' ? 'deficit' : 'exceedance'}${fails.length > 1 ? `; ${fails.length} measured elements fail` : ''}.`,
      remedy: [`${rule.operator === '>=' ? 'Increase' : 'Reduce'} the ${req!.category.toLowerCase()} by at least ${fmt(gap)} so it ${rule.operator === '>=' ? 'meets or exceeds' : 'does not exceed'} ${rule.source_threshold}.`, `Revise the drawing on page ${worst.page_number ?? '?'} and issue a new design version.`, 'Re-verify the revised dimension and rerun the assessment.'],
    };
  }
  if (rule && measured.length && status === 'COMPLIANT') {
    const tight = measured.reduce((a, b) => (Math.abs(Number(a.measured_mm) - rule.threshold) < Math.abs(Number(b.measured_mm) - rule.threshold) ? a : b));
    return { rootCause: `All ${measured.length} verified measurement(s) satisfy ${rule.source_threshold}; the closest is ${tight.element_name ?? 'element'} at ${fmt(Number(tight.measured_mm))}, a ${fmt(Math.abs(Number(tight.measured_mm) - rule.threshold))} margin.`, remedy: ['Maintain this dimension in later revisions.'] };
  }
  if (rule) return { rootCause: `No engineer-verified, directly observed ${req!.category.toLowerCase()} dimension was found on the processed pages, so ${req!.clause_reference} (${rule.source_threshold}) could not be compared.`, remedy: [`Provide: ${need.join('; ') || 'a literal dimension annotation'}.`, 'Process the drawing sheet that shows this feature and verify the measurement.', 'Rerun the assessment on that version.'] };
  return { rootCause: `${req?.clause_reference ?? 'This clause'} has no numeric rule; it is screened against text evidence only and needs engineer judgement.`, remedy: [need.length ? `Confirm evidence: ${need.join('; ')}.` : 'Record an engineering review with rationale.'] };
}
