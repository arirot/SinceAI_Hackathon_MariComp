export type OrganizationRole = 'administrator' | 'project_manager' | 'engineer' | 'reviewer';
export type Permission = 'manage_members' | 'engineer' | 'review' | 'verify_regulations';
export function permits(role: OrganizationRole, permission: Permission) {
  if (permission === 'manage_members') return role === 'administrator';
  if (permission === 'verify_regulations') return role === 'administrator' || role === 'reviewer' || role === 'engineer';
  if (permission === 'review') return role === 'administrator' || role === 'reviewer';
  return role === 'administrator' || role === 'project_manager' || role === 'engineer';
}
export function safeDestination(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !/^\/(auth|reset-password)([/?#]|$)/.test(value) ? value : '/dashboard';
}