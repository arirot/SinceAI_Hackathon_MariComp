import {supabase} from '@/integrations/supabase/client';
export async function uploadDesignFile(path:string,file:File,mime:string,onProgress:(percent:number)=>void) {
 const signed=await supabase.storage.from('design-documents').createSignedUploadUrl(path);
 if(signed.error)throw signed.error;
 await new Promise<void>((resolve,reject)=>{
  const request=new XMLHttpRequest();request.open('PUT',signed.data.signedUrl);
  request.setRequestHeader('Content-Type',mime);request.setRequestHeader('x-upsert','false');
  request.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};
  request.timeout=120000;
  request.onload=()=>{if(request.status>=200&&request.status<300){onProgress(100);resolve();}else reject(new Error(`Upload failed (${request.status}).`));};
  request.onerror=()=>reject(new Error('Upload interrupted. Please retry.'));
  request.ontimeout=()=>reject(new Error('Upload timed out. Please retry.'));
  request.send(file);
 });
}