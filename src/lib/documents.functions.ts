import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { validateDesignFile, MAX_DOCUMENT_BYTES } from './document-validation';

export const registerDocument = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: z.string().uuid(), documentId: z.string().uuid().nullable(), filename: z.string().trim().min(1).max(255), path: z.string().max(250), size: z.number().int().min(1).max(MAX_DOCUMENT_BYTES), revision: z.string().trim().min(1).max(40), category: z.enum(['engineering_drawing','general_arrangement','technical_specification','engineering_report','supporting_document','material_declaration','equipment_specification','certificate']) }))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/${data.projectId}/`)) throw new Error('Invalid document path.');
    const { data: member } = await context.supabase.from('projects').select('id').eq('id',data.projectId).maybeSingle();
    if (!member) throw new Error('Project access required.');
    const file = await context.supabase.storage.from('design-documents').download(data.path);
    if (file.error || !file.data) throw new Error('Uploaded file could not be validated.');
    const bytes=await file.data.arrayBuffer();
    const validated=validateDesignFile(data.filename,file.data.size,new Uint8Array(bytes));
    if (file.data.size !== data.size) throw new Error('File size does not match.');
    const digest = await crypto.subtle.digest('SHA-256',bytes);
    const hash = Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const result = await context.supabase.rpc('register_design_asset',{_project_id:data.projectId,_document_id:data.documentId ?? '00000000-0000-0000-0000-000000000000',_filename:data.filename,_path:data.path,_size:data.size,_revision:data.revision,_category:data.category,_sha256:hash,_format:validated.format,_mime:validated.mime});
    if (result.error) throw new Error(result.error.message);
    return { id: result.data };
  });