import { type FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMemberships } from '@/lib/account';
import { useEngineering } from '@/lib/engineering';
import { permits } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type CatalogSource = { id: string; title: string; regulation_number: string | null; rule_set_key: string; rule_set_version: string };

/** Administrators/reviewers create an organization-verified copy of a catalog edition; the shared catalog stays UNVERIFIED. */
export function RuleSetVerification({ sources }: { sources: CatalogSource[] }) {
  const memberships = useMemberships();
  const engineering = useEngineering();
  const queryClient = useQueryClient();
  const orgs = memberships.data?.filter((m) => permits(m.role, 'verify_regulations')) ?? [];
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  if (!orgs.length) return <p className="mb-5 text-sm text-muted-foreground">Only organization administrators, reviewers or engineers can verify a regulation for use in assessments.</p>;
  const verified = engineering.data?.sources.filter((s) => s.status === 'verified') ?? [];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget; const form = new FormData(el);
    setBusy(true);
    const { error } = await supabase.rpc('adopt_verified_rule_set', { _catalog_source_id: String(form.get('source')), _organization_id: String(form.get('org')), _rationale: String(form.get('rationale')) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Regulation verified for your organization — it is now available in Assessments.');
    el.reset(); setConfirmed(false);
    await queryClient.invalidateQueries({ queryKey: ['engineering'] });
  }
  return <section aria-label="Verify regulation" className="mb-6 border bg-card p-4">
    <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" />Verify a regulation for formal assessments</h2>
    <p className="mt-1 text-sm text-muted-foreground">Compare the imported wording with the official EUR-Lex text first. Verification creates an audited copy for your organization only; the shared catalog stays UNVERIFIED.</p>
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div><Label htmlFor="verify-source">Regulation</Label><select id="verify-source" name="source" required className="mt-1 h-9 w-full rounded-sm border bg-card px-3 text-sm"><option value="">Select regulation</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.regulation_number} · {s.rule_set_version}</option>)}</select></div>
      <div><Label htmlFor="verify-org">Organization</Label><select id="verify-org" name="org" required className="mt-1 h-9 w-full rounded-sm border bg-card px-3 text-sm">{orgs.map((m) => <option key={m.organization_id} value={m.organization_id}>{m.organizations?.name ?? m.organization_id}</option>)}</select></div>
      <div className="sm:col-span-2"><Label htmlFor="verify-rationale">Verification rationale</Label><Textarea id="verify-rationale" name="rationale" required minLength={20} className="mt-1" placeholder="e.g. Wording of all articles checked against the EUR-Lex OJ edition; amendments reviewed and not applicable to this project." /></div>
      <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />I confirm I have checked this wording against the official legal source and accept responsibility for this verification, which is recorded in the audit log.</label>
      <Button type="submit" disabled={busy || !confirmed} className="justify-self-start">{busy ? 'Verifying…' : 'Verify for my organization'}</Button>
    </form>
    {verified.length > 0 && <p className="mt-4 text-xs text-muted-foreground">Verified rule sets available to you: {verified.map((s) => s.title).join(', ')}</p>}
  </section>;
}
