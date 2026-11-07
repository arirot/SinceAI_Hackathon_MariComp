import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable, DemoNotice, PageHeader, StatusBadge } from "@/components/app/Page";
import { pageHead, resolveOverallStatus, type FindingStatus } from "@/lib/compliance";
import { DEMO_ASSESSMENTS, findingsFor } from "@/lib/demo-data";
import { useAccount } from '@/lib/account';
import { useEngineering } from '@/lib/engineering';
import { downloadAssessmentReport } from '@/lib/report-pdf';

export const Route = createFileRoute("/_authenticated/_workspace/reports")({
  head: () => pageHead("Reports", "Traceable PDF compliance reports per assessment."),
  component: Reports,
});

function Reports() {
  const { user } = useAccount();
  const engineering = useEngineering();
  const [busy, setBusy] = useState<string | null>(null);
  const data = engineering.data;
  if (!user) return <>
    <PageHeader code="MOD-07 / OUTPUT" title="Reports" description="PDF reports include every finding, its evidence, regulatory source and review decision." />
    <DemoNotice>Sign in to download reports for real assessments.</DemoNotice>
    <DataTable rowKey={(a) => a.id} rows={DEMO_ASSESSMENTS} columns={[
      { label: "Report", cell: (a) => <span className="font-mono">RPT-{a.id.slice(4)}</span> },
      { label: "Project", cell: (a) => <Link to="/projects/$projectId" params={{ projectId: a.projectId }} className="font-mono text-primary hover:underline">{a.projectId}</Link> },
      { label: "Outcome", cell: (a) => <StatusBadge status={resolveOverallStatus(findingsFor((f) => f.assessmentId === a.id).map((f) => f.status))} /> },
      { label: "File", cell: () => <Button size="sm" variant="outline" disabled>PDF</Button> },
    ]} />
  </>;
  async function download(id: string) {
    if (!data) return;
    setBusy(id);
    try { await downloadAssessmentReport(data, id); } catch (e) { toast.error(e instanceof Error ? e.message : 'Report could not be generated.'); }
    setBusy(null);
  }
  return <>
    <PageHeader code="MOD-07 / OUTPUT" title="Reports" description="PDF dossiers include vessel particulars, every finding with evidence and verified source, review decisions and a sign-off block." />
    <DataTable rowKey={(a) => a.id} rows={(data?.assessments ?? []).filter((a) => a.status !== 'queued' && a.status !== 'running')} empty={engineering.isPending ? 'Loading…' : 'No completed assessments yet. Run one on the Assessments page.'} columns={[
      { label: "Report", cell: (a) => <span className="font-mono">RPT-{a.id.slice(0, 8).toUpperCase()}</span> },
      { label: "Project", cell: (a) => data?.projects.find((p) => p.id === a.project_id)?.name ?? '' },
      { label: "Rule set", cell: (a) => `${data?.sources.find((s) => s.id === a.regulatory_source_id)?.title ?? ''} · ${a.rule_set_version}` },
      { label: "Completed", cell: (a) => <span className="font-mono text-xs">{a.completed_at?.slice(0, 16).replace('T', ' ') ?? '—'}</span> },
      { label: "Outcome", cell: (a) => <StatusBadge status={a.overall_status as FindingStatus} /> },
      { label: "File", cell: (a) => <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => void download(a.id)}>{busy === a.id ? 'Building…' : 'Download PDF'}</Button> },
    ]} />
  </>;
}
