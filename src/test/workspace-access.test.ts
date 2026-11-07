// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
const adminKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

describe.skipIf(!url || !key || !adminKey)('Private workspace access', () => {
  let admin: SupabaseClient<Database>;
  let owner: SupabaseClient<Database>;
  let other: SupabaseClient<Database>;
  const users: string[] = [];
  let projectId = '';
  let path = '';
  let ownerId = '';
  beforeAll(async () => {
    if (!url || !key || !adminKey) throw new Error('Cloud test configuration missing');
    admin = createClient<Database>(url, adminKey, { auth: { persistSession: false } });
    for (let i = 0; i < 2; i++) {
      const email = `access-${crypto.randomUUID()}@maricomp.test`;
      const password = crypto.randomUUID() + 'Aa9!';
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Access verification', organisation: 'Test', role: 'admin' } });
      if (error || !data.user) throw error ?? new Error('User not created');
      users.push(data.user.id);
      const client = createClient<Database>(url, key, { auth: { persistSession: false } });
      const result = await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (i === 0) { owner = client; ownerId = data.user.id; } else other = client;
    }
    const { data, error } = await owner.rpc('create_engineering_project', { _vessel: 'Access test', _vessel_type: 'Research', _class_society: 'Test', _flag: 'Test', _length_m: 72.5, _lead_engineer: 'Test' });
    if (error) throw error;
    projectId = data;
    path = `${ownerId}/${projectId}/${crypto.randomUUID()}.pdf`;
    const uploaded = await owner.storage.from('design-documents').upload(path, new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' }));
    if (uploaded.error) throw uploaded.error;
    const document = await owner.from('design_documents').insert({ user_id: ownerId, project_id: projectId, title: 'Access test.pdf', storage_path: path, size_bytes: 14 });
    if (document.error) throw document.error;
  }, 30000);
  afterAll(async () => {
    const elements=await admin.from('design_interpretations').select('id').eq('project_id',projectId);for(const element of elements.data??[])await admin.from('design_interpretation_reviews').delete().eq('interpretation_id',element.id);
    await admin.from('design_interpretations').delete().eq('project_id',projectId);await admin.from('design_interpretation_runs').delete().eq('project_id',projectId);
    if (path) await admin.storage.from('design-documents').remove([path]);
    await admin.from('design_versions').delete().eq('project_id', projectId);
    await admin.from('design_documents').delete().eq('project_id', projectId);
    await admin.from('activity_logs').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    await admin.from('vessels').delete().in('organization_id', users);
    for (const id of users) {
      const profile = await admin.from('profiles').select('default_organization_id').eq('id', id).single();
      const orgId = profile.data?.default_organization_id;
      if (orgId) {
        await admin.from('vessels').delete().eq('organization_id', orgId);
        await admin.from('profiles').update({ default_organization_id: null }).eq('id', id);
        await admin.from('organization_members').delete().eq('organization_id', orgId);
        await admin.from('organizations').delete().eq('id', orgId);
      }
      await admin.auth.admin.deleteUser(id);
    }
  });
  it('creates user-facing profile data on signup', async () => {
    const result = await owner.from('profiles').select('full_name,organisation').single();
    expect(result.data).toEqual({ full_name: 'Access verification', organisation: 'Test' });
  });
  it('does not take Admin access from editable signup metadata', async () => {
    const result = await owner.from('user_roles').select('role');
    expect(result.data).toEqual([{ role: 'engineer' }]);
  });
  it('cannot promote its own role', async () => {
    const result = await owner.from('user_roles').insert({ user_id: ownerId, role: 'admin' });
    expect(result.error).not.toBeNull();
  });
  it('hides another engineer’s projects', async () => {
    const result = await other.from('projects').select('id').eq('id', projectId);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
  it('denies downloading another engineer’s confidential PDF', async () => {
    const result = await other.storage.from('design-documents').download(path);
    expect(result.error).not.toBeNull();
    expect(result.data).toBeNull();
  });
  it('allows the owner to download their PDF', async () => {
    const result = await owner.storage.from('design-documents').download(path);
    expect(result.error).toBeNull();
    expect(await result.data?.text()).toBe('%PDF-1.4\n%%EOF');
  });
  it('denies another organization document deletion',async()=>{const d=await owner.from('design_documents').select('id').eq('project_id',projectId).single();const r=await other.rpc('archive_design_document',{_document_id:d.data?.id??''});expect(r.error).not.toBeNull();});
  it('rejects oversized registration metadata',async()=>{const r=await owner.rpc('register_design_file',{_project_id:projectId,_document_id:'00000000-0000-0000-0000-000000000000',_filename:'drawing.pdf',_path:path,_size:26214401,_revision:'A',_category:'general_arrangement',_sha256:'a'.repeat(64)});expect(r.error?.message).toContain('Invalid PDF metadata');});
  it('rejects registration of an unsupported file type',async()=>{const r=await owner.rpc('register_design_file',{_project_id:projectId,_document_id:'00000000-0000-0000-0000-000000000000',_filename:'drawing.exe',_path:path,_size:14,_revision:'A',_category:'general_arrangement',_sha256:'a'.repeat(64)});expect(r.error?.message).toContain('Invalid PDF metadata');});
  it('keeps corrections separate and denies another organization correction',async()=>{
    const d=await owner.from('design_documents').select('id').eq('project_id',projectId).single();const v=await owner.from('design_versions').select('id').eq('project_id',projectId).single();
    if(!d.data||!v.data)throw new Error('Missing document fixture');
    const item=await admin.from('extracted_design_elements').insert({project_id:projectId,document_id:d.data.id,design_version_id:v.data.id,element_type:'measurement',name:'Test',extracted_text:'12 mm',unit:'mm',extraction_method:'ocr',page_number:1}).select('id').single();if(item.error)throw item.error;
    const denied=await other.rpc('correct_extracted_item',{_id:item.data.id,_text:'999 mm'});expect(denied.error).not.toBeNull();
    const corrected=await owner.rpc('correct_extracted_item',{_id:item.data.id,_text:'12.5 mm'});expect(corrected.error).toBeNull();
    const row=await owner.from('extracted_design_elements').select('extracted_text,corrected_text,status,unit').eq('id',item.data.id).single();expect(row.data).toEqual({extracted_text:'12 mm',corrected_text:'12.5 mm',status:'unverified',unit:'mm'});
    await admin.from('extracted_design_elements').delete().eq('id',item.data.id);
  });
  it('protects interpretation access and separates auditable engineer verification',async()=>{
    const d=await owner.from('design_documents').select('id').eq('project_id',projectId).single();const v=await owner.from('design_versions').select('id').eq('project_id',projectId).single();if(!d.data||!v.data)throw new Error('Missing fixture');
    const run=await admin.from('design_interpretation_runs').insert({project_id:projectId,document_id:d.data.id,design_version_id:v.data.id,page_number:1,requested_by:ownerId,model:'test',status:'completed'}).select('id').single();if(!run.data)throw run.error;
    const payload={element_type:'door',element_name:'D1',deck:'Main',location:'Port',measured_value:900,unit:'mm',source_document:'Access test.pdf',page_number:1,confidence:0.8,information_origin:'DIRECTLY_OBSERVED',source_quote:'900 mm'};
    const item=await admin.from('design_interpretations').insert({...payload,project_id:projectId,document_id:d.data.id,design_version_id:v.data.id,run_id:run.data.id,original_element:payload}).select('id').single();if(!item.data)throw item.error;
    const hidden=await other.from('design_interpretations').select('id').eq('id',item.data.id);expect(hidden.data).toEqual([]);
    const denied=await other.rpc('review_design_interpretation',{_id:item.data.id,_element:payload,_decision:'VERIFIED',_rationale:'Unauthorized'});expect(denied.error).not.toBeNull();
    const org=await admin.from('projects').select('organization_id').eq('id',projectId).single();if(!org.data?.organization_id||!users[1])throw new Error('Missing membership fixture');
    await admin.from('organization_members').insert({organization_id:org.data.organization_id,user_id:users[1],role:'reviewer'});
    const inspected=await other.from('design_interpretations').select('id').eq('id',item.data.id);expect(inspected.data?.length).toBe(1);
    const reviewer=await other.rpc('review_design_interpretation',{_id:item.data.id,_element:payload,_decision:'VERIFIED',_rationale:'Reviewer not engineer'});expect(reviewer.error).not.toBeNull();
    for(const role of ['administrator','project_manager'] as const){await admin.from('organization_members').update({role}).eq('organization_id',org.data.organization_id).eq('user_id',users[1]);const allowed=await other.rpc('review_design_interpretation',{_id:item.data.id,_element:payload,_decision:'UNVERIFIED',_rationale:'Authorized engineering role'});expect(allowed.error).toBeNull();}
    await admin.from('organization_members').delete().eq('organization_id',org.data.organization_id).eq('user_id',users[1]);
    const inferred=await owner.rpc('review_design_interpretation',{_id:item.data.id,_element:{...payload,information_origin:'AI_INFERRED'},_decision:'VERIFIED',_rationale:'Inferred'});expect(inferred.error?.message).toContain('Inferred dimensions');
    const corrected=await owner.rpc('review_design_interpretation',{_id:item.data.id,_element:{...payload,element_name:'Door D1'},_decision:'UNVERIFIED',_rationale:'Corrected name from label'});expect(corrected.error).toBeNull();
    const verified=await owner.rpc('review_design_interpretation',{_id:item.data.id,_element:{...payload,element_name:'Door D1'},_decision:'VERIFIED',_rationale:'Checked source annotation'});expect(verified.error).toBeNull();
    const row=await owner.from('design_interpretations').select('verification_status,original_element,reviewed_by').eq('id',item.data.id).single();expect(row.data?.verification_status).toBe('VERIFIED');expect(row.data?.original_element).toEqual(payload);expect(row.data?.reviewed_by).toBe(ownerId);
    const log=await owner.from('design_interpretation_reviews').select('decision').eq('interpretation_id',item.data.id);expect(log.data?.length).toBe(4);
    await owner.from('design_interpretations').update({verification_status:'REJECTED'}).eq('id',item.data.id);const unchanged=await owner.from('design_interpretations').select('verification_status').eq('id',item.data.id).single();expect(unchanged.data?.verification_status).toBe('VERIFIED');
  });
  it('allows uploader archival and denies subsequent metadata and storage reads',async()=>{
    const d=await owner.from('design_documents').select('id').eq('project_id',projectId).single();if(!d.data)throw new Error('Missing fixture');const r=await owner.rpc('archive_design_document',{_document_id:d.data.id});expect(r.error).toBeNull();
    const metadata=await owner.from('design_documents').select('id').eq('id',d.data.id);expect(metadata.data).toEqual([]);
    const versions=await owner.from('design_versions').select('id').eq('document_id',d.data.id);expect(versions.data).toEqual([]);
    const download=await owner.storage.from('design-documents').createSignedUrl(path,60);expect(download.error).not.toBeNull();
  });
});