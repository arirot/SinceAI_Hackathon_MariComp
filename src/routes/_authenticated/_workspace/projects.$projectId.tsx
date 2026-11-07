import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DataTable, DemoNotice, PageHeader, Panel, StatCard, StatusBadge, Tag } from "@/components/app/Page";
import { pageHead, resolveOverallStatus } from "@/lib/compliance";
import { DEMO_DOCUMENTS, countStatus, findingsFor } from "@/lib/demo-data";
import { useProjects } from "@/lib/project-store";
import { useAccount } from '@/lib/account';
import { useDocuments } from '@/lib/document-store';

export const Route = createFileRoute("/_authenticated/_workspace/projects/$projectId")({
  head: ({ params }) => pageHead(`Project ${params.projectId}`, "Project particulars, documents and compliance findings."),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const project = useProjects().find((p) => p.id === projectId);
  const { user } = useAccount();
  const { documents } = useDocuments();
  if (!project) {
    return <p className="text-sm">Project not found. <Link to="/projects" className="text-accent underline">Back to projects</Link></p>;
  }
  const docs = documents.filter((d) => d.projectId === projectId);
  const findings = user ? [] : findingsFor((f) => f.projectId === projectId);
  const overall = resolveOverallStatus(findings.map((f) => f.status));

  return (
    <>
      <Link to="/projects" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" />Projects</Link>
      <PageHeader code={`${project.id} / ${project.version}`} title={project.vessel} description={`${project.type} · ${project.classSociety}`} actions={<div className="text-right"><p className="label-tech mb-1">Overall status</p><StatusBadge status={overall} /></div>} />
      {!user && <DemoNotice />}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Particulars">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            {([["Vessel type", project.type], ["Class", project.classSociety], ["Flag", project.flag], ["LOA", `${project.lengthM.toFixed(1)} m`], ["Lead engineer", project.owner], ["Design version", project.version], ["Updated", project.updated]] as const).map(([k, v]) => (
              <div key={k} className="contents"><dt className="label-tech">{k}</dt><dd className="font-mono">{v}</dd></div>
            ))}
          </dl>
        </Panel>
        <div className="grid grid-cols-3 gap-3 lg:col-span-2">
          <StatCard label="Compliant" value={countStatus(findings, "COMPLIANT")} tone="success" />
          <StatCard label="Non-compliant" value={countStatus(findings, "NON_COMPLIANT")} tone="destructive" />
          <StatCard label="Needs review" value={countStatus(findings, "REQUIRES_REVIEW")} tone="warning" />
          <p className="col-span-3 text-xs text-muted-foreground">Overall status stays at REQUIRES REVIEW or worse while any finding is open or lacks evidence.</p>
        </div>
      </div>
      <h2 className="label-tech mb-2 mt-6">Design documents</h2>
      <DataTable rowKey={(d) => d.id} rows={docs} empty="No documents uploaded for this project." columns={[
        { label: "ID", cell: (d) => <span className="font-mono">{d.id}</span> },
        { label: "Title", cell: (d) => d.title },
        { label: "Kind", cell: (d) => <Tag>{d.kind}</Tag> },
        { label: "Rev", cell: (d) => d.revision },
        { label: "Extraction", cell: (d) => d.extraction },
      ]} />
      <h2 className="label-tech mb-2 mt-6">Findings</h2>
      <DataTable rowKey={(f) => f.id} rows={findings} empty="No assessments run yet." columns={[
        { label: "ID", cell: (f) => <span className="font-mono">{f.id}</span> },
        { label: "Requirement", cell: (f) => f.requirement },
        { label: "Evidence", cell: (f) => f.evidence ?? <span className="text-muted-foreground">Missing</span> },
        { label: "Status", cell: (f) => <StatusBadge status={f.status} /> },
      ]} />
    </>
  );
}
