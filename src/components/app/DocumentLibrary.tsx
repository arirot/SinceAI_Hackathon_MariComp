import { useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Download, Eye, FilePlus2, Trash2, Upload, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount, useMemberships } from '@/lib/account';
import { permits } from '@/lib/permissions';
import { useProjects } from '@/lib/project-store';
import { useDocuments, type StoredDocument } from '@/lib/document-store';
import { registerDocument } from '@/lib/documents.functions';
import { DOCUMENT_CATEGORIES, DOCUMENT_ACCEPT, DOCUMENT_FORMATS, PROCESSING_STATES, CONVERSION_NOTICE, previewKind, processingState, validateDesignFile, formatFileSize } from '@/lib/document-validation';
import { uploadDesignFile } from '@/lib/upload-design-file';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DataTable, PageHeader, Tag } from './Page';
import { DesignFilePreview } from './DesignFilePreview';
import { ExtractionInspector } from './ExtractionInspector';
import { DesignInterpretation } from './DesignInterpretation';

export function DocumentLibrary() {
  const { user } = useAccount();
  const memberships = useMemberships();
  const projects = useProjects();
  const library = useDocuments();
  const queryClient = useQueryClient();
  const register = useServerFn(registerDocument);
  const [uploadOpen,setUploadOpen]=useState(false);
  const [versionTarget,setVersionTarget]=useState<StoredDocument | null>(null);
  const [selected,setSelected]=useState<StoredDocument | null>(null);
  const [previewPath,setPreviewPath]=useState('');
  const [previewPage,setPreviewPage]=useState(1);
  const [deleteTarget,setDeleteTarget]=useState<StoredDocument | null>(null);
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState('');
  const [search,setSearch]=useState('');
  const [projectFilter,setProjectFilter]=useState('');
  const [categoryFilter,setCategoryFilter]=useState('');
  const [formatFilter,setFormatFilter]=useState('');
  const [statusFilter,setStatusFilter]=useState('');
  const [percent,setPercent]=useState(0);
  const allowed = new Set(memberships.data?.filter(m=>permits(m.role,'engineer')).map(m=>m.organization_id));
  const uploadProjects=projects.filter(p=>p.organizationId&&allowed.has(p.organizationId));
  function roleFor(d:StoredDocument) { const org=projects.find(p=>p.id===d.projectId)?.organizationId;return memberships.data?.find(m=>m.organization_id===org)?.role; }
  function canDelete(d:StoredDocument) {const role=roleFor(d);return role==='administrator'||role==='project_manager'||(role==='engineer'&&d.uploaderId===user?.id);}
  const history=useQuery({queryKey:['document-versions',selected?.id],enabled:!!selected,queryFn:async()=>{
    const {data,error}=await supabase.from('design_versions').select('*').eq('document_id',selected?.id??'').order('version_number',{ascending:false});if(error)throw error;return data;
  }});
  async function refresh() { await Promise.all([queryClient.invalidateQueries({queryKey:['documents']}),queryClient.invalidateQueries({queryKey:['document-versions']}),queryClient.invalidateQueries({queryKey:['engineering']})]); }
  async function upload(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();if(!user)return;
    const form=new FormData(e.currentTarget);const projectId=versionTarget?.projectId??String(form.get('project'));
    const files=form.getAll('files').filter((f):f is File=>f instanceof File);
    const revision=String(form.get('revision')).trim();const category=versionTarget?.category??String(form.get('category'));
    if(!uploadProjects.some(p=>p.id===projectId))return;
    setBusy(true);
    try {
      for(const [index,file] of files.entries()) {
        setProgress(`Validating ${index+1} of ${files.length}: ${file.name}`);
        const validated=validateDesignFile(file.name,file.size,new Uint8Array(await file.arrayBuffer()));
        const path=`${user.id}/${projectId}/${crypto.randomUUID()}.${validated.format}`;
        setProgress(`Uploading ${index+1} of ${files.length}: ${file.name}`);
        setPercent(0);await uploadDesignFile(path,file,validated.mime,setPercent);
        try {
          setProgress(`Verifying ${file.name}`);
          await register({data:{projectId,documentId:versionTarget?.id??null,filename:file.name,path,size:file.size,revision,category:category as typeof DOCUMENT_CATEGORIES[number][0]}});
        } catch(error){await supabase.storage.from('design-documents').remove([path]);throw error;}
      }
      await refresh();toast.success(versionTarget?'New version saved':'Documents saved privately');setUploadOpen(false);setVersionTarget(null);
    }catch(error){toast.error(error instanceof Error?error.message:'Upload failed.');await refresh();}
    finally{setBusy(false);setProgress('');}
  }
  async function download(path:string,filename:string) {
    const result=await supabase.storage.from('design-documents').createSignedUrl(path,60,{download:filename});
    if(result.error){toast.error(result.error.message);return;}
    window.location.assign(result.data.signedUrl);
  }
  async function archive() {
    if(!deleteTarget)return;setBusy(true);
    const result=await supabase.rpc('archive_design_document',{_document_id:deleteTarget.id});setBusy(false);
    if(result.error)toast.error(result.error.message);else{toast.success('Document deleted from library');setDeleteTarget(null);setSelected(null);await refresh();}
  }
  const rows=library.documents.filter(d=>(!projectFilter||d.projectId===projectFilter)&&(!categoryFilter||d.category===categoryFilter)&&(!formatFilter||d.fileFormat===formatFilter)&&(!statusFilter||d.extraction===statusFilter)&&d.title.toLowerCase().includes(search.toLowerCase()));
  const previewVersion=history.data?.find(v=>v.storage_path===previewPath);
  const previewFormat=previewVersion?.file_format??selected?.fileFormat??'pdf';
  const categoryName=(value?:string)=>DOCUMENT_CATEGORIES.find(([key])=>key===value)?.[1]??'Supporting design document';
  return <>
    <PageHeader code="MOD-02 / DOCUMENT CONTROL" title="Engineering documents" description="2D drawings, 3D models and original design records." actions={<Button disabled={!uploadProjects.length} onClick={()=>{setVersionTarget(null);setUploadOpen(true);}}><Upload className="h-4 w-4" />Upload documents</Button>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search documents" placeholder="Search documents" value={search} onChange={e=>setSearch(e.target.value)} className="pl-9" /></div><select aria-label="Filter project" value={projectFilter} onChange={e=>setProjectFilter(e.target.value)} className="h-9 rounded-sm border bg-card px-3 text-sm"><option value="">All projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.vessel}</option>)}</select><select aria-label="Filter document category" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="h-9 rounded-sm border bg-card px-3 text-sm"><option value="">All document categories</option>{DOCUMENT_CATEGORIES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
    {library.error&&<p role="alert" className="mb-4 text-destructive">Documents could not be loaded.</p>}
    <div className="mb-5 flex flex-wrap gap-3"><select aria-label="Filter file format" value={formatFilter} onChange={e=>setFormatFilter(e.target.value)} className="h-9 rounded-sm border bg-card px-3 text-sm"><option value="">All formats</option>{DOCUMENT_FORMATS.map(f=><option key={f} value={f}>{f.toUpperCase()}</option>)}</select><select aria-label="Filter processing status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 rounded-sm border bg-card px-3 text-sm"><option value="">All processing states</option>{PROCESSING_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
    <DataTable rows={rows} rowKey={d=>d.id} empty={library.isPending?'Loading documents…':'No documents found.'} columns={[
      {label:'Document',cell:d=><div><Button variant="link" className="h-auto max-w-64 whitespace-normal break-words p-0 text-left" onClick={()=>{setSelected(d);setPreviewPath(d.storagePath??'');}}>{d.title}</Button><p className="mt-1 text-xs text-muted-foreground">{categoryName(d.category)}</p></div>},
      {label:'Project / vessel',cell:d=><Link to="/projects/$projectId" params={{projectId:d.projectId}} className="text-primary hover:underline">{projects.find(p=>p.id===d.projectId)?.vessel??d.projectId}</Link>},
      {label:'Type / size',cell:d=><div><Tag>{d.kind}</Tag><p className="mt-1 font-mono text-xs">{formatFileSize(d.sizeBytes??0)}</p></div>},
      {label:'Version',cell:d=><span className="font-mono text-xs">v{d.versionNumber} · Rev {d.revision}</span>},
      {label:'Uploaded',cell:d=><span className="whitespace-nowrap font-mono text-xs">{new Date(d.uploaded).toLocaleDateString()}<br />{new Date(d.uploaded).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>},
      {label:'Processing',cell:d=><div><Tag>{d.extraction}</Tag>{previewKind(d.fileFormat??'pdf')==='unsupported'&&<p className="mt-2 max-w-52 text-xs text-muted-foreground">{CONVERSION_NOTICE}</p>}</div>},
      {label:'Actions',cell:d=><div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={`Preview ${d.title}`} title="Preview and version history" onClick={()=>{setSelected(d);setPreviewPath(d.storagePath??'');}}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Download ${d.title}`} title="Download original file" onClick={()=>{if(d.storagePath)void download(d.storagePath,d.title);}}><Download className="h-4 w-4" /></Button>{roleFor(d)&&permits(roleFor(d)??'reviewer','engineer')&&<Button size="icon" variant="ghost" aria-label={`New version of ${d.title}`} title="Upload new version" onClick={()=>{setVersionTarget(d);setUploadOpen(true);}}><FilePlus2 className="h-4 w-4" /></Button>}{canDelete(d)&&<Button size="icon" variant="ghost" aria-label={`Delete ${d.title}`} title="Delete document" onClick={()=>setDeleteTarget(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>},
    ]} />
    <Dialog open={uploadOpen} onOpenChange={open=>{if(!busy)setUploadOpen(open);}}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{versionTarget?'Upload new version':'Upload engineering documents'}</DialogTitle><DialogDescription>{versionTarget?versionTarget.title:'Private PDF, PNG, JPG, GLB, glTF and CAD files · maximum 25 MB each'}</DialogDescription></DialogHeader><form onSubmit={upload} className="space-y-4">
      {!versionTarget&&<><div><Label htmlFor="upload-project">Project</Label><select id="upload-project" name="project" required className="mt-1 h-9 w-full rounded-sm border bg-card px-3 text-sm"><option value="">Select project</option>{uploadProjects.map(p=><option key={p.id} value={p.id}>{p.vessel}</option>)}</select></div><div><Label htmlFor="upload-category">Document category</Label><select id="upload-category" name="category" className="mt-1 h-9 w-full rounded-sm border bg-card px-3 text-sm">{DOCUMENT_CATEGORIES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div></>}
      <div><Label htmlFor="upload-revision">Revision</Label><Input id="upload-revision" name="revision" defaultValue={versionTarget?'':'A'} placeholder="A, B, C…" maxLength={40} required /></div><div><Label htmlFor="upload-files">Design files</Label><Input id="upload-files" name="files" type="file" accept={DOCUMENT_ACCEPT} multiple={!versionTarget} required disabled={busy} /></div>{progress&&<div><p role="status" className="break-words text-sm">{progress}</p><progress aria-label="File upload progress" value={percent} max={100} className="mt-2 h-2 w-full accent-primary"/><p className="text-right font-mono text-xs">{percent}%</p></div>}<Button type="submit" disabled={busy}><Upload className="h-4 w-4" />{busy?'Uploading…':versionTarget?'Save new version':'Upload documents'}</Button>
    </form></DialogContent></Dialog>
    <Dialog open={!!selected} onOpenChange={open=>{if(!open){setSelected(null);setPreviewPath('');}}}><DialogContent className="flex h-[92dvh] max-w-5xl flex-col overflow-y-auto"><DialogHeader><DialogTitle className="break-words pr-6">{previewVersion?.original_filename??selected?.title}</DialogTitle><DialogDescription>{categoryName(selected?.category)} · {projects.find(p=>p.id===selected?.projectId)?.vessel}</DialogDescription></DialogHeader><div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_240px]"><div className="min-w-0">{previewPath&&<DesignFilePreview key={previewPath} path={previewPath} format={previewFormat} onPageChange={setPreviewPage} />}</div><aside className="min-w-0"><h3 className="label-tech mb-3">Version history</h3>{history.isPending?<p className="text-sm">Loading versions…</p>:history.error?<p role="alert">Versions could not be loaded.</p>:history.data?.map(v=><div key={v.id} className="mb-3 border-b pb-3"><Button variant={previewPath===v.storage_path?'secondary':'ghost'} className="h-auto w-full justify-start whitespace-normal text-left" onClick={()=>{setPreviewPage(1);setPreviewPath(v.storage_path);}}>v{v.version_number} · Rev {v.revision}</Button><p className="mt-2 break-words text-xs">{v.original_filename??selected?.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}<br />{v.file_format.toUpperCase()} · {formatFileSize(v.size_bytes??0)}<br />{previewKind(v.file_format)==='unsupported'?'REQUIRES_REVIEW':processingState(v.status)}</p><p className="mt-1 break-all text-xs text-muted-foreground">Uploader: {v.created_by===user?.id?'You':v.created_by}</p>{v.processing_error&&<p className="mt-1 text-xs text-destructive">{v.processing_error}</p>}<Button variant="link" size="sm" className="mt-1 px-0" onClick={()=>download(v.storage_path,v.original_filename??selected?.title??'document')}><Download className="h-3 w-3" />Download v{v.version_number}</Button></div>)}</aside></div>{previewVersion&&previewFormat==='pdf'&&<><DesignInterpretation key={previewPath} versionId={previewVersion.id} page={previewPage} canReview={!!selected&&!!roleFor(selected)&&permits(roleFor(selected)??'reviewer','engineer')} /><ExtractionInspector versionId={previewVersion.id} canProcess={!!selected&&!!roleFor(selected)&&permits(roleFor(selected)??'reviewer','engineer')} /></>}</DialogContent></Dialog>
    <Dialog open={!!deleteTarget} onOpenChange={open=>{if(!open&&!busy)setDeleteTarget(null);}}><DialogContent><DialogHeader><DialogTitle>Delete document?</DialogTitle><DialogDescription>{deleteTarget?.title} will be removed from the library. Files are retained privately for audit. Assessed documents cannot be deleted.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={()=>setDeleteTarget(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={archive}>{busy?'Deleting…':'Delete document'}</Button></div></DialogContent></Dialog>
  </>;
}