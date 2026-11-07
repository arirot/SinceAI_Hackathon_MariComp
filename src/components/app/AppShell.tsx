import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAccount } from '@/lib/account';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  LayoutDashboard, FolderKanban, FileText, BookOpen, ShieldCheck,
  ListChecks, ClipboardCheck, FileOutput, Settings, Anchor, LogOut,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/regulations", label: "Regulations", icon: BookOpen },
  { to: "/assessments", label: "Assessments", icon: ShieldCheck },
  { to: "/findings", label: "Findings", icon: ListChecks },
  { to: "/reviews", label: "Reviews", icon: ClipboardCheck },
  { to: "/reports", label: "Reports", icon: FileOutput },
] as const;

const linkCls = "flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground data-[status=active]:shadow-[inset_2px_0_0_var(--sidebar-primary)]";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <Anchor className="h-5 w-5 text-accent" />
      <span className="font-mono text-sm font-semibold tracking-widest">MARICOMP</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAccount();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(error.message); return; }
    await navigate({ to: '/auth', replace: true });
  }
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="border-b border-sidebar-border px-5 py-4 text-sidebar-accent-foreground"><Logo /></div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={linkCls}><Icon className="h-4 w-4" />{label}</Link>
          ))}
        </nav>
        <div className="space-y-0.5 border-t border-sidebar-border p-2">
          <Link to="/settings" className={linkCls}><Settings className="h-4 w-4" />Settings</Link>
          {user ? <Button variant="ghost" className="w-full justify-start" onClick={signOut}><LogOut className="h-4 w-4" />Sign out</Button> : <Link to="/auth" className={linkCls}>Sign in</Link>}
        </div>
        <p className="border-t border-sidebar-border p-4 text-[11px] leading-snug opacity-70">
          Engineering decision-support tool. Not an official certification system.
        </p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-6 py-3">
          <Logo className="md:hidden" />
          <span className="label-tech hidden md:block">Ship-design regulatory compliance</span>
          <div className="flex items-center gap-2"><span className="label-tech">{loading ? 'Loading account…' : user ? 'Private workspace' : 'Demo workspace'}</span>{user && <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut className="h-4 w-4" /></Button>}</div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b bg-card px-4 py-2 md:hidden">
          {[...NAV, { to: "/settings", label: "Settings" } as const].map(({ to, label }) => (
            <Link key={to} to={to}
              className="whitespace-nowrap rounded-sm px-2 py-1 text-xs text-muted-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground">
              {label}
            </Link>
          ))}
        </nav>
        <main className="blueprint-bg flex-1 p-4 md:p-6">{loading ? <p>Loading workspace…</p> : children}</main>
      </div>
    </div>
  );
}
