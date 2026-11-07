import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const changeMember = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ organizationId: z.string().uuid(), userId: z.string().uuid(), role: z.enum(['administrator', 'project_manager', 'engineer', 'reviewer']), status: z.enum(['active', 'suspended']) }))
  .handler(async ({ data, context }) => {
    const { data: membership, error } = await context.supabase.from('organization_members').select('id').eq('organization_id', data.organizationId).eq('user_id', context.userId).eq('role', 'administrator').eq('status', 'active').maybeSingle();
    if (error || !membership) throw new Error('Administrator access required.');
    const result = await context.supabase.rpc('manage_organization_member', { _organization_id: data.organizationId, _user_id: data.userId, _role: data.role, _status: data.status });
    if (result.error) throw new Error(result.error.message);
    return { id: result.data };
  });