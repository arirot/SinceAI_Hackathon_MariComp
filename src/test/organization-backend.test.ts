// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
const adminKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
describe.skipIf(!url || !key || !adminKey)('Organization backend rules', () => {
  let admin: SupabaseClient<Database>;
  function at<T>(values: T[], index: number): T { const value = values[index]; if (value === undefined) throw new Error('Missing test fixture'); return value; }
  const clients: SupabaseClient<Database>[] = [];
  const users: string[] = [];
  const orgs: string[] = [];
  let project = ''; let otherProject = ''; let doc = ''; let version = ''; let source = ''; let otherSource = ''; let requirement = ''; let otherRequirement = ''; let assessment = ''; let finding = '';
  const makeProject = async (client: SupabaseClient<Database>, org?: string) => {
    const result = await client.rpc('create_engineering_project', { _vessel: 'Backend verification', _vessel_type: 'Research', _class_society: 'Test only', _flag: 'Test only', _length_m: 72.5, _lead_engineer: 'Test', ...org ? { _organization_id: org } : {} });
    if (result.error) throw result.error; return result.data;
  };
  beforeAll(async () => {
    if (!url || !key || !adminKey) throw new Error('Test configuration missing');
    admin = createClient<Database>(url, adminKey, { auth: { persistSession: false } });
    for (let i = 0; i < 5; i++) {
      const email = `organization-${crypto.randomUUID()}@maricomp.test`; const password = crypto.randomUUID()+'Aa9!';
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Backend verification', organisation: 'Same name test', role: 'administrator' } });
      if (created.error || !created.data.user) throw created.error ?? new Error('No user');
      users.push(created.data.user.id);
      const client = createClient<Database>(url,key,{auth:{persistSession:false}}); const login=await client.auth.signInWithPassword({email,password}); if(login.error) throw login.error; clients.push(client);
      const profile = await client.from('profiles').select('default_organization_id').single(); const org=profile.data?.default_organization_id; if(!org) throw new Error('No organization'); orgs.push(org);
    }
    project=await makeProject(at(clients, 0)); otherProject=await makeProject(at(clients, 1));
    const membership=await admin.from('organization_members').insert([
      {organization_id:at(orgs, 0),user_id:at(users, 2),role:'project_manager'},
      {organization_id:at(orgs, 0),user_id:at(users, 3),role:'reviewer'},
      {organization_id:at(orgs, 0),user_id:at(users, 4),role:'administrator'}]); if(membership.error) throw membership.error;
    const document=await at(clients, 0).from('design_documents').insert({project_id:project,user_id:at(users, 0),title:'Test only.pdf',storage_path:`${at(users, 0)}/${project}/${crypto.randomUUID()}.pdf`,size_bytes:20}).select('id').single(); if(document.error) throw document.error;doc=document.data.id;
    const versions=await at(clients, 0).from('design_versions').select('id').eq('document_id',doc).single(); if(versions.error) throw versions.error; version=versions.data.id;
    for(let i=0;i<2;i++) {
      const src=await admin.from('regulatory_sources').insert({organization_id:at(orgs, i),publisher:'Test only',title:'Test only',rule_set_key:crypto.randomUUID(),rule_set_version:'2026-test',source_url:'https://example.com/test-only'}).select('id').single();if(src.error) throw src.error;
      const req=await admin.from('regulatory_requirements').insert({regulatory_source_id:src.data.id,rule_set_version:'2026-test',clause_reference:'TEST-1',requirement_text:'Test fixture, not a regulation',category:'Test'}).select('id').single(); if(req.error) throw req.error;
      const publish=await admin.from('regulatory_sources').update({status:'verified',verified_by:at(users, 0),verified_at:new Date().toISOString(),published_at:new Date().toISOString()}).eq('id',src.data.id);if(publish.error) throw publish.error;
      if(i===0){source=src.data.id;requirement=req.data.id;}else{otherSource=src.data.id;otherRequirement=req.data.id;}
    }
    const a=await at(clients, 0).from('compliance_assessments').insert({project_id:project,design_version_id:version,regulatory_source_id:source,rule_set_version:'2026-test',requested_by:at(users, 0)}).select('id').single();if(a.error) throw a.error;assessment=a.data.id;
    const f=await admin.from('compliance_findings').insert({project_id:project,assessment_id:assessment,regulatory_requirement_id:requirement,regulatory_source_id:source,rule_set_version:'2026-test',title:'Test finding'}).select('id').single();if(f.error) throw f.error;finding=f.data.id;
  },60000);
  afterAll(async()=>{
    // Published regulatory fixtures cannot be deleted: immutable by design.
    // Remove linked operational fixtures, retaining their isolated organizations/profiles for provenance.
    if(assessment){await admin.from('engineering_reviews').delete().eq('assessment_id',assessment);await admin.from('assessment_evidence').delete().eq('assessment_id',assessment);await admin.from('compliance_findings').delete().eq('assessment_id',assessment);await admin.from('compliance_assessments').delete().eq('id',assessment);}
    if(version) await admin.from('design_versions').delete().eq('id',version);
    if(doc) await admin.from('design_documents').delete().eq('id',doc);
    for(const p of [project,otherProject]) {if(p){await admin.from('activity_logs').delete().eq('project_id',p);await admin.from('projects').delete().eq('id',p);}}
    for(const org of orgs) await admin.from('vessels').delete().eq('organization_id',org);
    // Fixtures with published sources keep identity references. Others are fully removed.
    for(let i=2;i<users.length;i++){await admin.from('organization_members').delete().eq('user_id',at(users, i));await admin.from('profiles').update({default_organization_id:null}).eq('id',at(users, i));await admin.from('organizations').delete().eq('id',at(orgs, i));await admin.auth.admin.deleteUser(at(users, i));}
    for (const id of users.slice(0,2)) {
      await admin.from('organization_members').delete().eq('user_id',id);
      await admin.auth.admin.updateUserById(id,{ban_duration:'876000h'});
    }
  });
  it('does not authorize organizations by matching display names', async()=>{const r=await at(clients, 1).from('projects').select('id').eq('id',project);expect(r.error).toBeNull();expect(r.data).toEqual([]);});
  it('assigns only Engineer organization access on signup', async()=>{const r=await at(clients, 0).from('organization_members').select('role').eq('user_id',at(users, 0));expect(r.data).toEqual([{role:'engineer'}]);});
  it('prevents self-promotion to Administrator',async()=>{await at(clients, 0).from('organization_members').update({role:'administrator'}).eq('user_id',at(users, 0));const r=await at(clients, 0).from('organization_members').select('role').eq('user_id',at(users, 0));expect(r.data).toEqual([{role:'engineer'}]);});
  it('lets Project Manager read an authorized project',async()=>{const r=await at(clients, 2).from('projects').select('id').eq('id',project).single();expect(r.error).toBeNull();expect(r.data?.id).toBe(project);});
  it('lets Administrator create projects',async()=>{const id=await makeProject(at(clients, 4),at(orgs, 0));expect(id).toMatch(/^[a-f0-9-]{36}$/);await admin.from('activity_logs').delete().eq('project_id',id);await admin.from('projects').delete().eq('id',id);});
  it('does not let Reviewer create projects',async()=>{const r=await at(clients, 3).rpc('create_engineering_project',{_organization_id:at(orgs, 0),_vessel:'Denied',_vessel_type:'Test',_class_society:'Test',_flag:'Test',_length_m:72.5,_lead_engineer:'Test'});expect(r.error).not.toBeNull();});
  it('rejects unauthorized organization project creation',async()=>{const r=await at(clients, 1).rpc('create_engineering_project',{_organization_id:at(orgs, 0),_vessel:'Denied',_vessel_type:'Test',_class_society:'Test',_flag:'Test',_length_m:72.5,_lead_engineer:'Test'});expect(r.error).not.toBeNull();});
  it('rejects document and design version project mismatch',async()=>{const r=await admin.from('design_versions').insert({project_id:otherProject,document_id:doc,created_by:at(users, 0),storage_path:`${at(users, 0)}/${otherProject}/${crypto.randomUUID()}.pdf`,version_number:2});expect(r.error?.code).toBe('23503');});
  it('rejects assessment and design version project mismatch',async()=>{const r=await admin.from('compliance_assessments').insert({project_id:otherProject,design_version_id:version,regulatory_source_id:otherSource,rule_set_version:'2026-test',requested_by:at(users, 1)});expect(r.error?.code).toBe('23503');});
  it('rejects mismatched regulatory rule-set version',async()=>{const r=await admin.from('compliance_assessments').insert({project_id:project,design_version_id:version,regulatory_source_id:source,rule_set_version:'wrong-version',requested_by:at(users, 0)});expect(r.error?.code).toBe('23503');});
  it('rejects finding requirement from another rule set',async()=>{const r=await admin.from('compliance_findings').insert({project_id:project,assessment_id:assessment,regulatory_requirement_id:otherRequirement,regulatory_source_id:source,rule_set_version:'2026-test',title:'Invalid'});expect(r.error?.code).toBe('23503');});
  it('prevents Engineer from writing review decisions',async()=>{const r=await at(clients, 0).from('engineering_reviews').insert({project_id:project,assessment_id:assessment,finding_id:finding,reviewer_id:at(users, 0),decision:'accept',rationale:'Test rationale'});expect(r.error).not.toBeNull();});
  it('allows Reviewer to record an auditable review',async()=>{const r=await at(clients, 3).from('engineering_reviews').insert({project_id:project,assessment_id:assessment,finding_id:finding,reviewer_id:at(users, 3),decision:'accept',rationale:'Test rationale'});expect(r.error).toBeNull();const f=await at(clients, 3).from('compliance_findings').select('review_status,deterministic_status').eq('id',finding).single();expect(f.data).toEqual({review_status:'accepted',deterministic_status:'REQUIRES_REVIEW'});});
  it('denies frontend regulatory publication',async()=>{await at(clients, 4).from('regulatory_sources').update({title:'Tampered'}).eq('id',source);const r=await at(clients, 4).from('regulatory_sources').select('title').eq('id',source).single();expect(r.data?.title).toBe('Test only');});
  it('denies frontend audit forgery',async()=>{const r=await at(clients, 0).from('activity_logs').insert({organization_id:at(orgs, 0),project_id:project,action:'fake',entity_type:'test',entity_id:project});expect(r.error).not.toBeNull();});
  it('does not allow COMPLIANT with unresolved findings',async()=>{const r=await admin.from('compliance_assessments').update({status:'completed',overall_status:'COMPLIANT'}).eq('id',assessment);expect(r.error?.message).toContain('prevent compliance');});
  it('keeps assessed design versions immutable',async()=>{const r=await admin.from('design_versions').update({revision:'Tampered'}).eq('id',version);expect(r.error?.message).toContain('immutable');});
  it('preserves assessed documents against uploader deletion',async()=>{const r=await at(clients,0).rpc('archive_design_document',{_document_id:doc});expect(r.error?.message).toContain('Assessed documents');});
  it('logs project creation without frontend audit writes',async()=>{const r=await at(clients, 0).from('activity_logs').select('action').eq('entity_id',project).eq('entity_type','projects');expect(r.data).toContainEqual({action:'insert'});});
  it('removes project access when membership is suspended',async()=>{await admin.from('organization_members').update({status:'suspended'}).eq('user_id',at(users, 2)).eq('organization_id',at(orgs, 0));const r=await at(clients, 2).from('projects').select('id').eq('id',project);expect(r.error).toBeNull();expect(r.data).toEqual([]);});
  it('allows Administrator to assign and suspend members with an audit record', async () => {
    const r = await at(clients,4).rpc('manage_organization_member',{_organization_id:at(orgs,0),_user_id:at(users,2),_role:'project_manager',_status:'active'});
    expect(r.error).toBeNull(); expect(r.data).toMatch(/^[a-f0-9-]{36}$/);
    const log = await at(clients,4).from('activity_logs').select('actor_id').eq('entity_id',r.data ?? '').eq('action','membership_changed');
    expect(log.data).toContainEqual({actor_id:at(users,4)});
  });
  for (const [index,role] of [[0,'Engineer'],[2,'Project Manager'],[3,'Reviewer']] as const) {
    it(`denies ${role} membership administration`,async()=>{
      const r=await at(clients,index).rpc('manage_organization_member',{_organization_id:at(orgs,0),_user_id:at(users,index),_role:'administrator'});
      expect(r.error?.code).toBe('42501');
    });
  }
  it('denies cross-organization member listing and management',async()=>{
    const r=await at(clients,1).rpc('manage_organization_member',{_organization_id:at(orgs,0),_user_id:at(users,1),_role:'administrator'});expect(r.error?.code).toBe('42501');
    const read=await at(clients,1).rpc('list_organization_members',{_organization_id:at(orgs,0)});expect(read.error?.code).toBe('42501');
  });
  it('preserves the last active Administrator',async()=>{
    const r=await at(clients,4).rpc('manage_organization_member',{_organization_id:at(orgs,0),_user_id:at(users,4),_role:'administrator',_status:'suspended'});
    expect(r.error?.message).toContain('at least one active administrator');
  });
  for(const [index,role] of [[0,'Engineer'],[2,'Project Manager'],[4,'Administrator']] as const) {
    it(`allows ${role} assessment initiation in queued review-required state`,async()=>{
      const r=await at(clients,index).from('compliance_assessments').insert({project_id:project,design_version_id:version,regulatory_source_id:source,rule_set_version:'2026-test',requested_by:at(users,index)}).select('id,status,overall_status').single();
      expect(r.error).toBeNull(); expect(r.data?.status).toBe('queued');expect(r.data?.overall_status).toBe('REQUIRES_REVIEW');
      if(r.data) await admin.from('compliance_assessments').delete().eq('id',r.data.id);
    });
  }
  it('denies Reviewer and non-member assessment initiation',async()=>{
    for(const index of [3,1]){const r=await at(clients,index).from('compliance_assessments').insert({project_id:project,design_version_id:version,regulatory_source_id:source,rule_set_version:'2026-test',requested_by:at(users,index)});expect(r.error).not.toBeNull();}
  });
  it('denies requester spoofing and completed or compliant assessment inserts',async()=>{
    for(const extra of [{requested_by:at(users,4)},{status:'completed'},{overall_status:'COMPLIANT'}]){
      const r=await at(clients,0).from('compliance_assessments').insert({project_id:project,design_version_id:version,regulatory_source_id:source,rule_set_version:'2026-test',requested_by:at(users,0),...extra});expect(r.error).not.toBeNull();
    }
  });
  it('denies Project Manager review decisions',async()=>{const r=await at(clients,2).from('engineering_reviews').insert({project_id:project,assessment_id:assessment,finding_id:finding,reviewer_id:at(users,2),decision:'accept',rationale:'Test'});expect(r.error).not.toBeNull();});
  it('allows Administrator review without changing deterministic status',async()=>{const r=await at(clients,4).from('engineering_reviews').insert({project_id:project,assessment_id:assessment,finding_id:finding,reviewer_id:at(users,4),decision:'accept',rationale:'Administrator review test'});expect(r.error).toBeNull();const f=await at(clients,4).from('compliance_findings').select('deterministic_status').eq('id',finding).single();expect(f.data?.deterministic_status).toBe('REQUIRES_REVIEW');});
  it('rejects reviewer spoofing, blank rationale and invalid relationships',async()=>{
    for(const extra of [{reviewer_id:at(users,4)},{rationale:'   '},{project_id:otherProject},{decision:'invalid'}]){const r=await at(clients,3).from('engineering_reviews').insert({project_id:project,assessment_id:assessment,finding_id:finding,reviewer_id:at(users,3),decision:'accept',rationale:'Test',...extra});expect(r.error).not.toBeNull();}
  });
  it('denies cross-organization reads across private record types',async()=>{
    for(const table of ['projects','design_documents','design_versions','compliance_assessments','compliance_findings','engineering_reviews','assessment_evidence','extracted_design_elements','activity_logs'] as const){const r=await at(clients,1).from(table).select('id');expect(r.error).toBeNull(); const own=await at(clients,0).from(table).select('id');expect(r.data?.some((row)=>own.data?.some((o)=>o.id===row.id))).toBe(false);}
  });
  it('denies anonymous private reads and membership RPC calls',async()=>{
    if(!url||!key)throw new Error('Missing test configuration');const anon=createClient<Database>(url,key,{auth:{persistSession:false}});
    for(const table of ['projects','design_documents','design_versions','compliance_assessments','compliance_findings','engineering_reviews','activity_logs','profiles','organization_members'] as const){const r=await anon.from(table).select('id');expect(r.error !== null || r.data?.length === 0).toBe(true);}
    const r=await anon.rpc('manage_organization_member',{_organization_id:at(orgs,0),_user_id:at(users,0),_role:'administrator'});expect(r.error).not.toBeNull();
  });
  it('suspension revokes document, assessment, review and member access',async()=>{
    const change=await at(clients,4).rpc('manage_organization_member',{_organization_id:at(orgs,0),_user_id:at(users,3),_role:'reviewer',_status:'suspended'});expect(change.error).toBeNull();
    for(const table of ['design_documents','design_versions','compliance_assessments','compliance_findings','engineering_reviews','assessment_evidence','activity_logs'] as const){const r=await at(clients,3).from(table).select('id');expect(r.error).toBeNull();expect(r.data).toEqual([]);}
    const read=await at(clients,3).rpc('list_organization_members',{_organization_id:at(orgs,0)});expect(read.error?.code).toBe('42501');
  });
});
