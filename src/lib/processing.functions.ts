import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { providerItems, withMeasurements, type ExtractionItem } from './extraction';

export const processVersion = createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
 .inputValidator(z.object({versionId:z.string().uuid()}))
 .handler(async({data,context})=>{
  const version=await context.supabase.from('design_versions').select('*').eq('id',data.versionId).single();if(version.error)throw new Error('Document version not accessible.');
  const v=version.data;
  if(v.mime_type!=='application/pdf')throw new Error('Conversion or specialised processing required. Only PDF extraction is currently supported.');
  const project=await context.supabase.from('projects').select('organization_id').eq('id',v.project_id).single();
  const membership=await context.supabase.from('organization_members').select('role').eq('organization_id',project.data?.organization_id??'').eq('user_id',context.userId).eq('status','active').single();
  if(!membership.data||!['administrator','project_manager','engineer'].includes(membership.data.role))throw new Error('Engineering processing access required.');
  const assessed=await context.supabase.from('compliance_assessments').select('id').eq('design_version_id',v.id).limit(1);if(assessed.data?.length)throw new Error('Assessed versions cannot be reprocessed. Upload a new version.');
  const {supabaseAdmin:admin}=await import('@/integrations/supabase/client.server');
  const previous=await admin.from('document_processing_jobs').select('*').eq('design_version_id',v.id).in('status',['queued','running']).maybeSingle();
  let job=previous.data;
  if(!job){
    const existing=await admin.from('extracted_design_elements').select('id').eq('design_version_id',v.id).limit(1);if(existing.data?.length)return{status:'completed' as const};
    const created=await admin.from('document_processing_jobs').insert({project_id:v.project_id,document_id:v.document_id,design_version_id:v.id,requested_by:context.userId,status:'running'}).select('*').single();if(created.error)throw new Error('A processing request is already active.');job=created.data;
  }
  const key=process.env['LLAMACLOUD_API_KEY'];const token=process.env['LOVABLE_API_KEY'];
  const headers={Authorization:`Bearer ${token}`,'X-Connection-Api-Key':key??''};
  const gateway='https://connector-gateway.lovable.dev/llamacloud';
  try{
    if(job.provider_job_id){
      if(!key||!token)throw new Error('Document processor is not connected.');
      const response=await fetch(`${gateway}/api/v2/parse/${job.provider_job_id}?expand=items&expand=text&expand=metadata`,{headers});
      if(!response.ok){const body=await response.text();console.error(`Document processor [${response.status}]: ${body}`);if(response.status===429||response.status>=500)return{status:'running' as const};throw new Error(`Document processor rejected job (${response.status}).`);}
      const result=await response.json() as Record<string,unknown>;const state=(result['job'] as {status?:string})?.status;
      if(state==='FAILED'||state==='CANCELLED')throw new Error('Document processor could not extract this file.');
      if(state!=='COMPLETED')return{status:'running' as const};
      const pages=job.page_metadata as Array<{page:number;scanned:boolean}>;
      const items=withMeasurements(providerItems(result,pages.filter(p=>p.scanned).map(p=>p.page)));
      if(!items.length)throw new Error('Processor returned no extractable content.');
      const saved=await admin.rpc('complete_document_processing',{_job_id:job.id,_items:JSON.parse(JSON.stringify(items)),_provider_result:JSON.parse(JSON.stringify(result))});if(saved.error)throw new Error('Extraction results could not be committed.');
      return{status:'completed' as const};
    }
    const file=await context.supabase.storage.from('design-documents').download(v.storage_path);if(file.error||!file.data)throw new Error('Document could not be opened.');
    const {getDocumentProxy,inspectPages}=await import('unpdf');const pdf=await getDocumentProxy(new Uint8Array(await file.data.arrayBuffer()),{maxImageSize:16777216});
    const inspection=await inspectPages(pdf);
    const items:ExtractionItem[]=[];const pages:Array<{page:number;scanned:boolean;text_characters:number}>=[];
    for(let page=1;page<=pdf.numPages;page++){
      const sheet=await pdf.getPage(page);const text=await sheet.getTextContent();let chars=0;
      for(const item of text.items){if(!('str' in item)||!item.str.trim())continue;chars+=item.str.trim().length;items.push({page,text:item.str,type:'text',unit:null,method:'embedded_text',confidence:null,location:{transform:item.transform,width:item.width,height:item.height,coordinate_system:'PDF user space'},raw:{}});}
      const inspected=inspection.pages[page-1];
      pages.push({page,scanned:chars===0||!!(inspected&&inspected.imageCoverage>0.8&&inspected.textLength-inspected.invisibleTextLength<20),text_characters:chars});
    }
    await pdf.cleanup();
    await admin.from('document_processing_jobs').update({page_metadata:pages}).eq('id',job.id);
    await admin.from('design_versions').update({status:'extracting'}).eq('id',v.id);
    if(pages.some(p=>p.scanned)||items.some(i=>/\b(tables?|dimensions?)\b/i.test(i.text))||items.filter(i=>/\d/.test(i.text)).length>=3){
      if(!key||!token)throw new Error('OCR processor is not connected.');
      const form=new FormData();form.append('file',file.data,v.original_filename??'document.pdf');form.append('configuration',JSON.stringify({tier:'agentic',version:'latest'}));
      const response=await fetch(`${gateway}/api/v2/parse/upload`,{method:'POST',headers,body:form});
      if(!response.ok){console.error(`OCR request [${response.status}]: ${await response.text()}`);throw new Error(`OCR request failed (${response.status}).`);}
      const result=await response.json() as {id?:string};if(!result.id)throw new Error('OCR processor did not return a job.');
      await admin.from('document_processing_jobs').update({provider_job_id:result.id}).eq('id',job.id);return{status:'running' as const};
    }
    const saved=await admin.rpc('complete_document_processing',{_job_id:job.id,_items:JSON.parse(JSON.stringify(withMeasurements(items))),_provider_result:JSON.parse('{}')});if(saved.error)throw new Error('Extraction results could not be committed.');
    return{status:'completed' as const};
  }catch(error){const message=error instanceof Error?error.message:'Processing failed.';await admin.from('document_processing_jobs').update({status:'failed',error:message}).eq('id',job.id);await admin.from('design_versions').update({status:'failed',processing_error:message}).eq('id',v.id);throw new Error(message);}
 });