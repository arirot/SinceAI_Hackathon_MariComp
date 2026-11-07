import {lazy,Suspense,useEffect,useState} from 'react';
import {ClientOnly} from '@tanstack/react-router';
import {supabase} from '@/integrations/supabase/client';
import {previewKind,CONVERSION_NOTICE} from '@/lib/document-validation';
import {PdfPreview} from './PdfPreview';
const ModelPreview=lazy(()=>import('./ModelPreview'));
function ImagePreview({path}:{path:string}) {
 const [url,setUrl]=useState('');const [error,setError]=useState('');
 useEffect(()=>{let cancelled=false;let objectUrl='';setUrl('');setError('');void (async()=>{const result=await supabase.storage.from('design-documents').download(path);if(cancelled)return;if(result.error){setError('Private image could not be opened.');return;}objectUrl=URL.createObjectURL(result.data);setUrl(objectUrl);})();return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[path]);
 return error?<p role="alert">{error}</p>:url?<img src={url} alt="Engineering drawing preview" className="max-h-[65dvh] w-full object-contain" onError={()=>setError('Image could not be decoded.')}/>:<p role="status">Loading private image…</p>;
}
export function DesignFilePreview({path,format,onPageChange}:{path:string;format:string;onPageChange:(p:number)=>void}) {
 const kind=previewKind(format);
 if(kind==='pdf')return <PdfPreview key={path} path={path} onPageChange={onPageChange}/>;
 if(kind==='image')return <ImagePreview path={path}/>;
 if(kind==='model')return <ClientOnly fallback={<p>Loading model viewer…</p>}><Suspense fallback={<p>Loading model viewer…</p>}><ModelPreview path={path} format={format}/></Suspense></ClientOnly>;
 return <p role="status" className="py-10 text-sm">{CONVERSION_NOTICE}</p>;
}