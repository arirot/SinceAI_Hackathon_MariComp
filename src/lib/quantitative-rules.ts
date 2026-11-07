/**
 * Browser/test mirror of the database `quantitative-1` engine (run_compliance_assessment).
 * Only engineer-verified, directly observed measurements are compared; thresholds come from
 * the verified regulatory record, never from AI output.
 */
import type { FindingStatus } from './compliance';

export interface NumericRule { type: 'numeric'; operator: '>=' | '<='; threshold: number; threshold_in?: number; unit: 'mm'; source_threshold: string; match: string[] }
export interface Measurement { value: number; unit: string | null; verified: boolean; observed: boolean }

const FACTORS: Record<string, number> = { mm: 1, millimetre: 1, millimeter: 1, millimetres: 1, millimeters: 1, cm: 10, m: 1000, metre: 1000, meter: 1000, in: 25.4, inch: 25.4, inches: 25.4, '"': 25.4, ft: 304.8, feet: 304.8, foot: 304.8, "'": 304.8 };

const IMPERIAL = new Set(['in', 'inch', 'inches', '"', 'ft', 'feet', 'foot', "'"]);

export function lengthToMm(value: number, unit: string | null): number | null {
  const f = FACTORS[(unit ?? '').trim().toLowerCase()];
  return f === undefined ? null : value * f;
}

export function evaluateNumericRule(rule: NumericRule, measurements: Measurement[]): { status: FindingStatus; passed: number; failed: number } {
  let passed = 0, failed = 0;
  for (const m of measurements) {
    if (!m.verified || !m.observed) continue;
    const mm = lengthToMm(m.value, m.unit);
    if (mm === null) continue;
    // The clause states dual units; imperial measurements are compared against the stated inch value.
    const imperial = IMPERIAL.has((m.unit ?? '').trim().toLowerCase()) && rule.threshold_in !== undefined;
    const v = imperial ? mm / 25.4 : mm, t = imperial ? rule.threshold_in! : rule.threshold;
    if (rule.operator === '>=' ? v >= t : v <= t) passed++; else failed++;
  }
  const status: FindingStatus = failed > 0 ? 'NON_COMPLIANT' : passed > 0 ? 'COMPLIANT' : 'REQUIRES_REVIEW';
  return { status, passed, failed };
}
