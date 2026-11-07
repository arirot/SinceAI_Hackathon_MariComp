import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/Page";
import { FINDING_STATUSES, pageHead } from "@/lib/compliance";
import { useAccount } from '@/lib/account';

export const Route = createFileRoute("/")({
  head: () => pageHead("Ship-design compliance support", "MariComp helps naval architects check ship-design documents against verified maritime regulations, with engineer review on every finding."),
  component: Landing,
});

const STEPS = [
  ["01", "Upload", "Drawings, calculations and specifications, kept private per project."],
  ["02", "Extract", "Text and drawing data with page-level references."],
  ["03", "Validate", "Deterministic rules against verified regulatory sources."],
  ["04", "Review", "Qualified engineers accept or override every finding."],
  ["05", "Report", "Traceable PDF reports for each design version."],
];

function Landing() {
  const { user } = useAccount();
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b bg-card px-6 py-3">
        <Logo />
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm"><Link to={user ? '/settings' : '/auth'}>{user ? 'Account' : 'Sign in'}</Link></Button>
          <Button asChild size="sm"><Link to='/dashboard'>{user ? 'Workspace' : 'Open workspace'}</Link></Button>
        </div>
      </header>
      <section className="blueprint-bg border-b">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="label-tech">Maritime engineering · decision support</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Check ship designs against regulations — <span className="text-accent">with evidence for every finding.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            MariComp maps your design documents to verified regulatory sources, runs repeatable rule checks and sends anything uncertain to a qualified engineer.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to={user ? '/dashboard' : '/auth'}>Open engineering workspace</Link></Button>
            <Button asChild variant="outline"><Link to="/auth">Create account</Link></Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-px overflow-hidden px-6 py-12 md:grid-cols-5">
        {STEPS.map(([n, t, d]) => (
          <div key={n} className="border-l-2 border-primary/20 py-2 pl-4 pr-2">
            <p className="font-mono text-xs text-accent">{n}</p>
            <p className="mt-1 font-medium">{t}</p>
            <p className="mt-1 text-xs text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-sm border bg-card p-6">
          <p className="label-tech mb-3">Finding outcomes</p>
          <div className="flex flex-wrap gap-2">{FINDING_STATUSES.map((s) => <StatusBadge key={s} status={s} />)}</div>
          <p className="mt-3 text-sm text-muted-foreground">Missing evidence or an unverified source always results in REQUIRES REVIEW. A vessel is never shown as compliant while findings remain open.</p>
        </div>
      </section>
      <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        MariComp is an engineering decision-support tool, not an official certification system.
      </footer>
    </div>
  );
}
