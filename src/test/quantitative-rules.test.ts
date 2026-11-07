import { describe, expect, it } from 'vitest';
import { evaluateNumericRule, lengthToMm, type NumericRule } from '@/lib/quantitative-rules';

const door: NumericRule = { type: 'numeric', operator: '>=', threshold: 815, unit: 'mm', threshold_in: 32, source_threshold: '32 inches (815 mm)', match: ['door'] };
const m = (value: number, unit: string, verified = true, observed = true) => ({ value, unit, verified, observed });

describe('quantitative rule engine', () => {
  it('flags a 780 mm door as non-compliant against 815 mm minimum', () => expect(evaluateNumericRule(door, [m(780, 'mm')]).status).toBe('NON_COMPLIANT'));
  it('passes a door exactly at 815 mm', () => expect(evaluateNumericRule(door, [m(815, 'mm')]).status).toBe('COMPLIANT'));
  it('converts inches: 32 in passes, 31 in fails', () => { expect(evaluateNumericRule(door, [m(32, 'in')]).status).toBe('COMPLIANT'); expect(evaluateNumericRule(door, [m(31, 'in')]).status).toBe('NON_COMPLIANT'); });
  it('any failing measurement makes the finding non-compliant', () => expect(evaluateNumericRule(door, [m(900, 'mm'), m(700, 'mm')]).status).toBe('NON_COMPLIANT'));
  it('ignores unverified or inferred measurements -> requires review', () => expect(evaluateNumericRule(door, [m(700, 'mm', false), m(700, 'mm', true, false)]).status).toBe('REQUIRES_REVIEW'));
  it('unknown units are never guessed', () => { expect(lengthToMm(10, 'furlongs')).toBeNull(); expect(evaluateNumericRule(door, [m(10, 'furlongs')]).status).toBe('REQUIRES_REVIEW'); });
  it('no evidence -> requires review', () => expect(evaluateNumericRule(door, []).status).toBe('REQUIRES_REVIEW'));
});
