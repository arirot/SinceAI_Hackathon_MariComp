import { useAccount } from '@/lib/account';
import { useDocuments } from '@/lib/document-store';
import { createFileRoute, Link } from "@tanstack/react-router";
import { DataTable, DemoNotice, PageHeader, Panel, StatCard } from "@/components/app/Page";
import { NewProjectDialog } from "@/components/app/NewProjectDialog";
import { pageHead } from "@/lib/compliance";
import { DEMO_ACTIVITY, DEMO_ASSESSMENTS, DEMO_DOCUMENTS, DEMO_FINDINGS, countStatus, findingsFor } from "@/lib/demo-data";
import { useProjects } from "@/lib/project-store";
import { useEngineering } from "@/lib/engineering";

export const Route = createFileRoute("/_authenticated/_workspace/dashboard")({
  head: () => pageHead("Overview", "Engineering projects, documents and compliance status at a glance."),
  component: Dashboard,
});

function Dashboard() {
  const projects = useProjects();
  const { user } = useAccount();
  const { documents } = useDocuments();
  const eng = useEngineering();
  const live = eng.data;
  type Row = { id: string; projectId: string; label: string; scope: string; c: number; nc: number; rr: number };
  const statusOf = (f: { deterministic_status?: string; status?: string }) => ({ status: f.deterministic_status ?? f.status ?? "" });
  const findings = user ? (live?.findings ?? []).map(statusOf) : DEMO_FINDINGS;
  const assessments: Row[] = user
    ? (live?.assessments ?? []).slice(0, 8).map((a) => {
        const fs = (live?.findings ?? []).filter((f) => f.assessment_id === a.id).map(statusOf);
        const proj = live?.projects.find((p) => p.id === a.project_id);
        const src = live?.sources.find((s) => s.id === a.regulatory_source_id);
        return { id: a.id, projectId: a.project_id, label: proj?.vessel || proj?.name || a.project_id.slice(0, 8), scope: src ? `${src.regulation_number ?? src.title} · ${a.rule_set_version}` : a.rule_set_version, c: countStatus(fs as never, "COMPLIANT"), nc: countStatus(fs as never, "NON_COMPLIANT"), rr: countStatus(fs as never, "REQUIRES_REVIEW") };
      })
    : DEMO_ASSESSMENTS.map((a) => { const f = findingsFor((x) => x.assessmentId === a.id); return { id: a.id, projectId: a.projectId, label: a.projectId, scope: a.scope, c: countStatus(f, "COMPLIANT"), nc: countStatus(f, "NON_COMPLIANT"), rr: countStatus(f, "REQUIRES_REVIEW") }; });
  const assessmentCount = user ? (live?.assessments.length ?? 0) : DEMO_ASSESSMENTS.length;
  const activity = user ? projects.map((p) => ({ at: p.updated, who: p.owner, what: `Created project ${p.vessel}` })) : DEMO_ACTIVITY;
  return (
    <>
      <PageHeader code="SYS / OVERVIEW" title="Overview" description="Engineering projects, design documents and compliance status." actions={<NewProjectDialog />} />
      {!user && <DemoNotice />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Projects" value={projects.length} />
        <StatCard label="Documents" value={documents.length} />
        <StatCard label="Assessments" value={assessmentCount} />
        <StatCard label="Compliant" value={countStatus(findings as never, "COMPLIANT")} tone="success" />
        <StatCard label="Non-compliant" value={countStatus(findings as never, "NON_COMPLIANT")} tone="destructive" />
        <StatCard label="Needs review" value={countStatus(findings as never, "REQUIRES_REVIEW")} tone="warning" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title="Recent compliance assessments" className="lg:col-span-3" action={<Link to="/assessments" className="text-xs text-accent hover:underline">View all</Link>}>
          <DataTable rowKey={(a) => a.id} rows={assessments} columns={[
            { label: "ID", cell: (a) => <span className="font-mono">{a.id.slice(0, 8)}</span> },
            { label: "Project", cell: (a) => <Link to="/projects/$projectId" params={{ projectId: a.projectId }} className="font-mono text-primary hover:underline">{a.label}</Link> },
            { label: "Scope", cell: (a) => a.scope },
            { label: "C / NC / RR", cell: (a) => <span className="font-mono">{a.c} / {a.nc} / {a.rr}</span> },
          ]} />
        </Panel>
        <Panel title="Recent engineering activity" className="lg:col-span-2">
          <ol className="divide-y text-sm">
            {activity.map((a) => (
              <li key={`${a.at}-${a.what}`} className="py-2">
                <p>{a.what}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{a.at} · {a.who}</p>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}
