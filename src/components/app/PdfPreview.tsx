import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export type DrawingHighlight={x:number;y:number;w:number;h:number;label:string;tone:'fail'|'pass'|'review'};
export function PdfPreview({ path,onPageChange,initialPage=1,highlights=[] }: { path: string;onPageChange?:(page:number)=>void;initialPage?:number;highlights?:DrawingHighlight[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(initialPage);
  const [count, setCount] = useState(0);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  useEffect(()=>{setPage(initialPage);setCount(0);},[path,initialPage]);
  useEffect(()=>{onPageChange?.(page);},[page,onPageChange]);
  useEffect(()=>{
    let cancelled=false;
    let dispose: (()=>void) | undefined;
    setLoading(true);setError('');
    async function render() {
      try {
        const result=await supabase.storage.from('design-documents').download(path);
        if(result.error||!result.data)throw new Error('Preview could not be loaded.');
        const pdfjs=await import('pdfjs-dist');
        const worker=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
        const task=pdfjs.getDocument({data:await result.data.arrayBuffer()});
        dispose=()=>{void task.destroy();};
        const pdf=await task.promise;if(cancelled)return;
        setCount(pdf.numPages);
        const sheet=await pdf.getPage(Math.min(page,pdf.numPages));
        const target=canvas.current;if(!target||cancelled)return;
        const viewport=sheet.getViewport({scale:1.4});
        target.width=viewport.width;target.height=viewport.height;
        const context=target.getContext('2d');if(!context)throw new Error('Preview unavailable.');
        await sheet.render({canvas:target,canvasContext:context,viewport}).promise;
      } catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Preview unavailable.');}
      finally{if(!cancelled)setLoading(false);}
    }
    void render();return()=>{cancelled=true;dispose?.();};
  },[path,page]);
  return <div>
    <div className="mb-3 flex items-center justify-center gap-3"><Button size="icon" variant="outline" aria-label="Previous page" title="Previous page" disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}><ChevronLeft /></Button><span className="font-mono text-xs">Page {page} / {count||'—'}</span><Button size="icon" variant="outline" aria-label="Next page" title="Next page" disabled={page>=count||loading} onClick={()=>setPage(p=>p+1)}><ChevronRight /></Button></div>
    {loading&&<p className="mb-3 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Loading preview…</p>}
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="relative mx-auto w-fit max-w-full">
      <canvas ref={canvas} className="block h-auto max-w-full border bg-card" aria-label={`Document preview page ${page}`} />
      {page===initialPage&&!loading&&highlights.map((h,i)=><div key={i} className={`pointer-events-none absolute border-2 ${h.tone==='fail'?'border-destructive bg-destructive/15':h.tone==='pass'?'border-success bg-success/15':'border-warning bg-warning/15'}`} style={{left:`${h.x*100}%`,top:`${h.y*100}%`,width:`${h.w*100}%`,height:`${h.h*100}%`}}><span className={`absolute -top-6 left-0 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${h.tone==='fail'?'bg-destructive text-destructive-foreground':h.tone==='pass'?'bg-success text-success-foreground':'bg-warning text-warning-foreground'}`}>{h.label}</span></div>)}
    </div>
  </div>;
}