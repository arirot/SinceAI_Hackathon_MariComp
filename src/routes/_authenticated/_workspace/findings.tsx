import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DataTable, DemoNotice, PageHeader, StatusBadge } from "@/components/app/Page";
import { FINDING_STATUSES, pageHead, type FindingStatus } from "@/lib/compliance";
import { DEMO_FINDINGS, DEMO_REGULATIONS } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { explainFinding } from "@/lib/finding-explanation";
import { useAccount } from '@/lib/account';
import { useEngineering } from '@/lib/engineering';
import { PdfPreview } from '@/components/app/PdfPreview';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const Route = createFileRoute("/_authenticated/_workspace/findings")({
  head: () => pageHead("Findings & Recommendations", "Explainable compliance findings with evidence and source references."),
  component: Findings,
});

function Findings() {
  const { user } = useAccount();
  const [filter, setFilter] = useState<FindingStatus | "ALL">("ALL");
  const engineering = useEngineering();
  if (user) return <LiveFindings filter={filter} setFilter={setFilter} data={engineering.data} pending={engineering.isPending} />;
  const rows = filter === "ALL" ? DEMO_FINDINGS : DEMO_FINDINGS.filter((f) => f.status === filter);
  return (
    <>
      <PageHeader code="MOD-05 / FINDINGS" title="Findings & recommendations" description="Each finding shows its rule result, document evidence and regulatory source." />
      {!user && <DemoNotice />}
      <div className="mb-3 flex flex-wrap gap-1">
        {(["ALL", ...FINDING_STATUSES] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={cn("rounded-sm border px-2 py-1 font-mono text-[11px] tracking-wider", filter === s ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>
      <DataTable rowKey={(f) => f.id} rows={rows} empty="No findings with this status." columns={[
        { label: "ID", cell: (f) => <span className="font-mono">{f.id}</span> },
        { label: "Project", cell: (f) => <Link to="/projects/$projectId" params={{ projectId: f.projectId }} className="font-mono text-primary hover:underline">{f.projectId}</Link> },
        { label: "Requirement", cell: (f) => f.requirement },
        { label: "Source", cell: (f) => { const r = DEMO_REGULATIONS.find((x) => x.id === f.sourceId); return <span className="text-xs">{r?.instrument} {r?.part}{!r?.verified && <span className="block font-mono text-warning-foreground">UNVERIFIED</span>}</span>; } },
        { label: "Evidence", cell: (f) => f.evidence ? <span className="font-mono text-xs">{f.evidence}</span> : <span className="text-xs text-muted-foreground">Missing</span> },
        { label: "Rule", cell: (f) => <span className="font-mono text-xs uppercase">{f.ruleResult ?? "—"}</span> },
        { label: "Status", cell: (f) => <StatusBadge status={f.status} /> },
        { label: "Recommendation", cell: (f) => <span className="text-xs">{f.recommendation}</span> },
      ]} />
    </>
  );
}

type Eng = ReturnType<typeof useEngineering>['data'];
type Ev = NonNullable<Eng>['evidence'][number];
function region(e: Ev) { const r = e.design_interpretations?.region as { x: number; y: number; w: number; h: number } | null | undefined; return r && typeof r.x === 'number' ? r : null; }
function LiveFindings({ filter, setFilter, data, pending }: { filter: FindingStatus | "ALL"; setFilter: (s: FindingStatus | "ALL") => void; data: Eng; pending: boolean }) {
  const rows = (data?.findings ?? []).filter((f) => filter === "ALL" || f.deterministic_status === filter);
  const [view, setView] = useState<{ ev: Ev; findingTitle: string } | null>(null);
  const version = view ? data?.versions.find((v) => v.id === view.ev.design_version_id) : undefined;
  const pageEv = view ? (data?.evidence ?? []).filter((e) => e.design_version_id === view.ev.design_version_id && e.page_number === view.ev.page_number && region(e)) : [];
  return <>
    <PageHeader code="MOD-05 / FINDINGS" title="Findings & recommendations" description="Each finding shows its rule result, document evidence and verified regulatory source." />
    <p className="mb-4 border-l-4 border-warning bg-warning/10 px-4 py-3 text-sm">Numeric rules compare only engineer-verified, directly observed drawing measurements against the verified clause threshold. Text-only evidence is never auto-verified and stays REQUIRES REVIEW. Decision-support only, not certification.</p>
    <div className="mb-3 flex flex-wrap gap-1">
      {(["ALL", "COMPLIANT", "NON_COMPLIANT", "REQUIRES_REVIEW"] as const).map((s) => <button key={s} onClick={() => setFilter(s)} className={cn("rounded-sm border px-2 py-1 font-mono text-[11px] tracking-wider", filter === s ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>{s.replace("_", " ")}</button>)}
    </div>
    <DataTable rowKey={(f) => f.id} rows={rows} empty={pending ? "Loading findings…" : "No findings yet. Run an assessment first."} columns={[
      { label: "Project", cell: (f) => <Link to="/projects/$projectId" params={{ projectId: f.project_id }} className="text-primary hover:underline">{data?.projects.find((p) => p.id === f.project_id)?.name ?? "Project"}</Link> },
      { label: "Requirement", cell: (f) => <span className="block min-w-48">{f.title}</span> },
      { label: "Source", cell: (f) => { const s = data?.sources.find((x) => x.id === f.regulatory_source_id); return <a href={s?.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{s?.title} · {f.rule_set_version}</a>; } },
      { label: "Evidence / measured vs required", cell: (f) => { const ev = data?.evidence.filter((e) => e.finding_id === f.id) ?? []; return ev.length ? <ul className="max-w-80 space-y-2 text-xs">{ev.map((e, i) => { const t = e.threshold as { operator?: string; source_threshold?: string; threshold?: number } | null; return <li key={i} className="space-y-0.5">
        {e.rule_outcome && <div className={cn("font-mono font-semibold", e.rule_outcome === 'fail' ? 'text-destructive' : 'text-success')}>{e.design_interpretations?.element_name ?? 'Element'}: {e.measured_value} {e.measured_unit} ({e.measured_mm} mm) {t?.operator} {t?.source_threshold} → {e.rule_outcome === 'fail' ? `FAIL, Δ ${Math.round(Number(e.measured_mm) - Number(t?.threshold))} mm` : 'PASS'}</div>}
        <div><span className="font-mono">p.{e.page_number ?? "?"}</span> “{e.source_quote.slice(0, 120)}” <span className="font-mono text-muted-foreground">{e.verified ? 'engineer-verified' : 'unverified'}</span></div>
        {e.page_number && <button className="text-primary underline" onClick={() => setView({ ev: e, findingTitle: f.title })}>View on drawing</button>}
      </li>; })}</ul> : <span className="text-xs text-muted-foreground">Missing</span>; } },
      { label: "Status", cell: (f) => <StatusBadge status={f.deterministic_status as FindingStatus} /> },
      { label: "Engineering explanation", cell: (f) => { const req = f.regulatory_requirements as { clause_reference: string; category: string; deterministic_rule: unknown; required_evidence: unknown } | null; const ex = explainFinding(f.deterministic_status, req, (data?.evidence ?? []).filter((e) => e.finding_id === f.id).map((e) => ({ ...e, element_name: e.design_interpretations?.element_name }))); return <div className="max-w-96 space-y-1.5 text-xs">
        <div className="font-mono text-[11px] text-muted-foreground">{req?.clause_reference}</div>
        <p><span className="font-semibold">Why: </span>{ex.rootCause}</p>
        <div><span className="font-semibold">Remedy:</span><ol className="ml-4 list-decimal">{ex.remedy.map((r, i) => <li key={i}>{r}</li>)}</ol></div>
      </div>; } },
    ]} />
    <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-auto">
        <DialogHeader><DialogTitle>{view?.findingTitle}</DialogTitle><DialogDescription>{version?.design_documents?.title} · Rev {version?.revision} · page {view?.ev.page_number}. {pageEv.length ? 'Boxes mark located elements: red fails, green passes the clause threshold.' : 'This element has no recorded page location; inspect the quoted annotation on the page.'}</DialogDescription></DialogHeader>
        {view && version && version.mime_type === 'application/pdf' ? <PdfPreview path={version.storage_path} initialPage={view.ev.page_number ?? 1} highlights={pageEv.map((e) => ({ ...region(e)!, tone: e.rule_outcome === 'fail' ? 'fail' : e.rule_outcome === 'pass' ? 'pass' : 'review', label: `${e.design_interpretations?.element_name ?? ''}${e.measured_value != null ? ` ${e.measured_value} ${e.measured_unit}` : ''}` }))} /> : <p className="text-sm text-muted-foreground">Drawing preview is available for PDF versions only.</p>}
      </DialogContent>
    </Dialog>
  </>;
}
