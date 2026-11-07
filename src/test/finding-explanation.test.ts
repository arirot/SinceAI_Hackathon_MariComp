import { describe, expect, it } from 'vitest';
import { assessSufficiency, explainFinding } from '@/lib/finding-explanation';

const door = { id: 'r1', clause_reference: '§404.2.3', category: 'Doors — clear width', required_evidence: ['Door schedule'], deterministic_rule: { type: 'numeric', operator: '>=', threshold: 815, threshold_in: 32, unit: 'mm', source_threshold: '32 inches (815 mm)', match: ['door'] } };
const text = { id: 'r2', clause_reference: 'Art. 5', category: 'IHM', required_evidence: [], deterministic_rule: {} };
const i = (o: object) => ({ element_name: 'Door 1 clear width', element_type: 'dimension', measured_value: 30, unit: 'in', verification_status: 'VERIFIED', information_origin: 'DIRECTLY_OBSERVED', page_number: 8, ...o });

describe('document sufficiency', () => {
  it('is insufficient with no matching measurements', () => {
    expect(assessSufficiency([door, text], [i({ element_name: 'Title block', measured_value: null, page_number: 1 })]).verdict).toBe('INSUFFICIENT');
  });
  it('unverified or AI-inferred values do not count as ready', () => {
    const s = assessSufficiency([door], [i({ verification_status: 'UNVERIFIED' }), i({ information_origin: 'AI_INFERRED' })]);
    expect(s.items[0]?.coverage).toBe('NEEDS_VERIFICATION');
    expect(s.verdict).toBe('INSUFFICIENT');
  });
  it('is sufficient with a verified observed measurement', () => {
    expect(assessSufficiency([door], [i({})]).verdict).toBe('SUFFICIENT');
  });
});

describe('engineering explanation', () => {
  it('states the deficit for a failing door', () => {
    const e = explainFinding('NON_COMPLIANT', door, [{ element_name: 'Door 1', measured_value: 28, measured_unit: 'in', measured_mm: 711.2, rule_outcome: 'fail', page_number: 8, threshold: null }]);
    expect(e.rootCause).toContain('104 mm deficit');
  });
  it('explains missing evidence without a value', () => {
    expect(explainFinding('REQUIRES_REVIEW', door, []).rootCause).toContain('could not be compared');
  });
});
