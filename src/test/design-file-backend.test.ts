// @vitest-environment node
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/integrations/supabase/types';
const url=process.env['SUPABASE_URL'],key=process.env['SUPABASE_PUBLISHABLE_KEY'],adminKey=process.env['SUPABASE_SERVICE_ROLE_KEY'];
describe.skipIf(!url||!key||!adminKey)('Multi-format private originals',()=>{
 let admin:SupabaseClient<Database>,owner:SupabaseClient<Database>,stranger:SupabaseClient<Database>;
 let project='',document='',vessel='';const users:string[]=[],orgs:string[]=[],paths:string[]=[];
 beforeAll(async()=>{
  if(!url||!key||!adminKey)throw new Error('Test configuration missing');
  admin=createClient<Database>(url,adminKey,{auth:{persistSession:false}});
  for(let i=0;i<2;i++){
   const email=`design-file-${crypto.randomUUID()}@maricomp.test`,password=crypto.randomUUID()+'Aa9!';
   const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error||!created.data.user)throw created.error??new Error('Missing user');users.push(created.data.user.id);
   const client=createClient<Database>(url,key,{auth:{persistSession:false}});const login=await client.auth.signInWithPassword({email,password});if(login.error)throw login.error;
   if(i===0)owner=client;else stranger=client;
   const profile=await client.from('profiles').select('default_organization_id').single();if(profile.data?.default_organization_id)orgs.push(profile.data.default_organization_id);
  }
  const p=await owner.rpc('create_engineering_project',{_vessel:'Multi-format test',_vessel_type:'Research',_class_society:'Test',_flag:'Test',_length_m:40,_lead_engineer:'Test'});if(p.error)throw p.error;project=p.data;
  const record=await owner.from('projects').select('vessel_id').eq('id',project).single();vessel=record.data?.vessel_id??'';
 },30000);
 afterAll(async()=>{
  if(project){await admin.from('design_versions').delete().eq('project_id',project);await admin.from('design_documents').delete().eq('project_id',project);await admin.from('activity_logs').delete().eq('project_id',project);await admin.from('projects').delete().eq('id',project);}
  if(paths.length)await admin.storage.from('design-documents').remove(paths);
  for(const org of orgs)await admin.from('vessels').delete().eq('organization_id',org);
  for(const user of users){await admin.from('organization_members').delete().eq('user_id',user);await admin.from('profiles').update({default_organization_id:null}).eq('id',user);}
  for(const org of orgs){await admin.from('activity_logs').delete().eq('organization_id',org);await admin.from('organizations').delete().eq('id',org);}
  for(const user of users)await admin.auth.admin.deleteUser(user);
 });
 async function upload(format:string,mime:string){const path=`${users[0]}/${project}/${crypto.randomUUID()}.${format}`;paths.push(path);const result=await owner.storage.from('design-documents').upload(path,new Blob(['test original'],{type:mime}),{contentType:mime});if(result.error)throw result.error;return path;}
 const args=(path:string,format:string,mime:string)=>({_project_id:project,_document_id:document||'00000000-0000-0000-0000-000000000000',_filename:`test.${format}`,_path:path,_size:13,_revision:'A',_category:'certificate',_sha256:'a'.repeat(64),_format:format,_mime:mime});
 it('registers image originals with project vessel and UPLOADED state',async()=>{
  const path=await upload('png','image/png');const r=await owner.rpc('register_design_asset',args(path,'png','image/png'));expect(r.error).toBeNull();document=r.data??'';
  const v=await owner.from('design_versions').select('vessel_id,file_format,status').eq('document_id',document).single();expect(v.data).toEqual({vessel_id:vessel,file_format:'png',status:'uploaded'});
 });
 it('preserves GLB as a second version without claiming processing',async()=>{
  const path=await upload('glb','model/gltf-binary');const r=await owner.rpc('register_design_asset',args(path,'glb','model/gltf-binary'));expect(r.error).toBeNull();
  const v=await owner.from('design_versions').select('version_number,status,file_format').eq('document_id',document).order('version_number');expect(v.data).toEqual([{version_number:1,status:'uploaded',file_format:'png'},{version_number:2,status:'uploaded',file_format:'glb'}]);
 });
 it('denies cross-organization model downloads',async()=>{const path=paths[1];if(!path)throw new Error('Missing GLB path');const r=await stranger.storage.from('design-documents').download(path);expect(r.error).not.toBeNull();});
 it('denies cross-organization file metadata',async()=>{const r=await stranger.from('design_versions').select('id').eq('document_id',document);expect(r.data).toEqual([]);});
 it('rejects inconsistent format MIME metadata',async()=>{const path=await upload('gltf','model/gltf+json');const r=await owner.rpc('register_design_asset',args(path,'gltf','application/pdf'));expect(r.error).not.toBeNull();});
 it('rejects vessel links outside the project',async()=>{const r=await admin.from('design_versions').update({vessel_id:crypto.randomUUID()}).eq('document_id',document);expect(r.error?.message).toContain('vessel must match');});
});