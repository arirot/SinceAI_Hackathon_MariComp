import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FindingStatus } from "@/lib/compliance";

export function PageHeader({ code, title, description, actions }: {
  code: string; title: string; description: string; actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b pb-4">
      <div>
        <p className="label-tech">{code}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}

export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-sm border border-accent/40 bg-accent/10 px-3 py-2 text-xs">
      <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
      <span><strong className="font-mono tracking-wider">DEMONSTRATION DATA.</strong>{" "}
        {children ?? "Fictional records for interface preview. Not real vessels, documents or verified regulatory findings."}</span>
    </div>
  );
}

export function Panel({ title, children, className, action }: { title: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-sm border bg-card", className)}>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="label-tech">{title}</h2>{action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "success" | "destructive" | "warning" }) {
  const bar = { default: "bg-primary", success: "bg-success", destructive: "bg-destructive", warning: "bg-warning" }[tone];
  return (
    <div className="relative overflow-hidden rounded-sm border bg-card p-4">
      <span className={cn("absolute inset-y-0 left-0 w-1", bar)} />
      <p className="label-tech">{label}</p>
      <p className="mt-2 font-mono text-3xl font-semibold">{value}</p>
    </div>
  );
}

const STATUS_STYLE: Record<FindingStatus, string> = {
  COMPLIANT: "bg-success text-success-foreground",
  NON_COMPLIANT: "bg-destructive text-destructive-foreground",
  REQUIRES_REVIEW: "bg-warning text-warning-foreground",
  NOT_EVALUATED: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: FindingStatus }) {
  return (
    <span className={cn("inline-block whitespace-nowrap rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider", STATUS_STYLE[status])}>
      {status.replace("_", " ")}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded-sm border bg-secondary px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-secondary-foreground">{children}</span>;
}

export interface Column<T> { label: string; cell: (row: T) => ReactNode; className?: string }

export function DataTable<T>({ columns, rows, empty = "No records.", rowKey }: {
  columns: Column<T>[]; rows: T[]; empty?: string; rowKey: (row: T) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-sm border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-primary text-primary-foreground">
          <tr>{columns.map((c) => <th key={c.label} className="whitespace-nowrap px-3 py-2 text-left font-mono text-[11px] font-medium uppercase tracking-wider">{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">{empty}</td></tr>
          ) : rows.map((r) => (
            <tr key={rowKey(r)} className="hover:bg-muted/60">
              {columns.map((c) => <td key={c.label} className={cn("px-3 py-2 align-top", c.className)}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
