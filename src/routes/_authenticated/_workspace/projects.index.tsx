import { createFileRoute, Link } from "@tanstack/react-router";
import { DataTable, DemoNotice, PageHeader, Tag } from "@/components/app/Page";
import { NewProjectDialog } from "@/components/app/NewProjectDialog";
import { pageHead } from "@/lib/compliance";
import { useProjects } from "@/lib/project-store";
import { useAccount } from '@/lib/account';

export const Route = createFileRoute("/_authenticated/_workspace/projects/")({
  head: () => pageHead("Projects", "Vessel design projects, classification and design versions."),
  component: Projects,
});

function Projects() {
  const projects = useProjects();
  const { user } = useAccount();
  return (
    <>
      <PageHeader code="MOD-01 / PROJECTS" title="Projects" description="Vessel design projects and their current design version." actions={<NewProjectDialog />} />
      {!user && <DemoNotice />}
      <DataTable rowKey={(p) => p.id} rows={projects} columns={[
        { label: "ID", cell: (p) => <Link to="/projects/$projectId" params={{ projectId: p.id }} className="font-mono text-primary hover:underline">{p.id}</Link> },
        { label: "Vessel", cell: (p) => <span className="font-medium">{p.vessel}</span> },
        { label: "Type", cell: (p) => p.type },
        { label: "Class", cell: (p) => p.classSociety },
        { label: "LOA (m)", cell: (p) => <span className="font-mono">{p.lengthM.toFixed(1)}</span>, className: "text-right" },
        { label: "Version", cell: (p) => <Tag>{p.version}</Tag> },
        { label: "Lead", cell: (p) => p.owner },
        { label: "Updated", cell: (p) => <span className="font-mono text-xs">{p.updated}</span> },
      ]} />
    </>
  );
}
