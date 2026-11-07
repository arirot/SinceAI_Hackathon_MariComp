import { describe, expect, it } from 'vitest';
import { permits, safeDestination, type OrganizationRole } from '@/lib/permissions';
describe('Organization permissions', () => {
  for (const [role,manage,engineer,review] of [
    ['administrator',true,true,true], ['project_manager',false,true,false], ['engineer',false,true,false], ['reviewer',false,false,true],
  ] as const) {
    it(`${role} has only its assigned permissions`, () => {
      expect(permits(role as OrganizationRole,'manage_members')).toBe(manage);
      expect(permits(role as OrganizationRole,'engineer')).toBe(engineer);
      expect(permits(role as OrganizationRole,'review')).toBe(review);
    });
  }
  it('lets administrators, reviewers and engineers verify regulations, but not project managers', () => {
    expect(permits('engineer','verify_regulations')).toBe(true);
    expect(permits('reviewer','verify_regulations')).toBe(true);
    expect(permits('administrator','verify_regulations')).toBe(true);
    expect(permits('project_manager','verify_regulations')).toBe(false);
  });
  it('preserves a private same-origin destination', () => { expect(safeDestination('/documents')).toBe('/documents'); });
  it('rejects external and authentication-loop destinations', () => { for (const path of ['//evil.example','https://evil.example','/\\evil.example','/auth','/reset-password']) expect(safeDestination(path)).toBe('/dashboard'); });
});