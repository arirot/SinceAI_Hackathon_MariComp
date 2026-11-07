import { useAccount } from '@/lib/account';
import { AccountSettings } from '@/components/app/AccountSettings';
import { createFileRoute } from "@tanstack/react-router";
import { DataTable, DemoNotice, PageHeader, Panel, Tag } from "@/components/app/Page";
import { pageHead } from "@/lib/compliance";

export const Route = createFileRoute("/_authenticated/_workspace/settings")({
  head: () => pageHead("Settings", "Organisation, users and role-based access."),
  component: Settings,
});

const USERS = [
  { name: "A. Okafor", email: "a.okafor@demo.example", role: "Admin" },
  { name: "L. Hansen", email: "l.hansen@demo.example", role: "Engineer" },
  { name: "R. Mendes", email: "r.mendes@demo.example", role: "Reviewer" },
  { name: "S. Ito", email: "s.ito@demo.example", role: "Viewer" },
];
const ROLES = [
  ["Admin", "Manage organisation, users and regulatory library"],
  ["Engineer", "Create projects, upload documents, run assessments"],
  ["Reviewer", "Accept or override findings; sign off reports"],
  ["Viewer", "Read-only access to assigned projects"],
];

function Settings() {
  const { user } = useAccount();
  return (
    <>
      <PageHeader code="SYS / SETTINGS" title="Settings" description="Organisation, users and role-based access control." />
      {user ? <AccountSettings /> : <>
      <DemoNotice />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DataTable rowKey={(u) => u.email} rows={USERS} columns={[
            { label: "User", cell: (u) => u.name },
            { label: "Email", cell: (u) => <span className="font-mono text-xs">{u.email}</span> },
            { label: "Role", cell: (u) => <Tag>{u.role}</Tag> },
          ]} />
        </div>
        <Panel title="Roles">
          <dl className="space-y-2 text-sm">
            {ROLES.map(([r, d]) => <div key={r}><dt className="font-medium">{r}</dt><dd className="text-xs text-muted-foreground">{d}</dd></div>)}
          </dl>
        </Panel>
      </div>
      </>}
    </>
  );
}
