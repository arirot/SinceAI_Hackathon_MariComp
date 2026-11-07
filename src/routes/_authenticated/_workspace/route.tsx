import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/_workspace")({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
