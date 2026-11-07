import {useState,useEffect,useRef} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {supabase} from '@/integrations/supabase/client';
import {processVersion} from '@/lib/processing.functions';
import {DataTable,Tag} from './Page';
export function ExtractionInspector({versionId,canProcess}:{versionId:string;canProcess:boolean}){
 const run=useServerFn(processVersion);const client=useQueryClient();const [busy,setBusy]=useState(false);const [running,setRunning]=useState(false);const [editing,setEditing]=useState('');const [correction,setCorrection]=useState('');
 const attempts=useRef(0);
 const items=useQuery({queryKey:['extractions',versionId],queryFn:async()=>{const r=await supabase.from('extracted_design_elements').select('*').eq('design_version_id',versionId).order('page_number');if(r.error)throw r.error;return r.data;}});
 const jobs=useQuery({queryKey:['processing-jobs',versionId],queryFn:async()=>{const r=await supabase.from('document_processing_jobs').select('status').eq('design_version_id',versionId).order('created_at',{ascending:false}).limit(1);if(r.error)throw r.error;return r.data;}});
 useEffect(()=>{if(canProcess&&jobs.data?.[0]?.status==='running')setRunning(true);},[jobs.data,canProcess]);
 async function process(){setBusy(true);try{const r=await run({data:{versionId}});setRunning(r.status==='running');await client.invalidateQueries({queryKey:['extractions']});await client.invalidateQueries({queryKey:['document-versions']});await client.invalidateQueries({queryKey:['documents']});if(r.status==='completed')toast.success('Extraction saved for engineering review');}catch(e){setRunning(false);toast.error(e instanceof Error?e.message:'Processing failed.');}finally{setBusy(false);}}
 useEffect(()=>{if(!running||busy)return;if(attempts.current>=120){setRunning(false);toast('OCR is still pending. Reopen or resume processing later.');return;}const timer=setTimeout(()=>{attempts.current+=1;void process();},5000);return()=>clearTimeout(timer);},[running,busy]);
 async function save(){const r=await supabase.rpc('correct_extracted_item',{_id:editing,_text:correction});if(r.error)toast.error(r.error.message);else{setEditing('');await client.invalidateQueries({queryKey:['extractions']});toast.success('Correction saved; measurement remains unverified');}}
 return <section className="mt-5 border-t pt-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="label-tech">Extracted information</h3>{canProcess&&<Button size="sm" disabled={busy||running} onClick={process}>{running?'OCR processing…':busy?'Extracting…':'Process document'}</Button>}</div><Tag>UNVERIFIED EXTRACTION</Tag>
 {items.error&&<p role="alert">Extracted information could not be loaded.</p>}
 <DataTable rows={items.data??[]} rowKey={i=>i.id} columns={[
 {label:'Page / type',cell:i=><span>{i.page_number} · {i.element_type}</span>},
 {label:'Text',cell:i=><div className="max-w-xl whitespace-pre-wrap break-words">{i.corrected_text??i.extracted_text}<br />{i.corrected_text&&<span className="text-xs text-muted-foreground">Original: {i.extracted_text}</span>}</div>},
 {label:'Unit',cell:i=>i.unit??'—'},
 {label:'Method / confidence',cell:i=><span>{i.extraction_method}<br />{i.confidence===null?'Not supplied':i.confidence}</span>},
 {label:'Source location',cell:i=><details><summary className="cursor-pointer text-xs">Coordinates</summary><pre className="max-w-48 overflow-auto text-xs">{JSON.stringify(i.source_location,null,2)??'Not available'}</pre></details>},
 {label:'Review',cell:i=><Button size="sm" variant="outline" onClick={()=>{setEditing(i.id);setCorrection(i.corrected_text??i.extracted_text??'');}}>Correct</Button>},
 ]}/>{editing&&<div className="mt-3 space-y-2"><Label htmlFor="extraction-correction">Corrected transcription</Label><textarea id="extraction-correction" className="min-h-24 w-full rounded-sm border bg-card p-3 text-sm" value={correction} onChange={e=>setCorrection(e.target.value)} maxLength={20000}/><div className="flex gap-2"><Button disabled={!correction.trim()} onClick={save}>Save correction</Button><Button variant="outline" onClick={()=>setEditing('')}>Cancel</Button></div></div>}</section>;
}