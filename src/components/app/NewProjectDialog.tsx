import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addProject } from "@/lib/project-store";
import { useAccount, useMemberships } from '@/lib/account';
import { permits } from '@/lib/permissions';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const FIELDS = [
  ["vessel", "Vessel name", "text"],
  ["type", "Vessel type", "text"],
  ["classSociety", "Classification society", "text"],
  ["flag", "Flag state", "text"],
  ["lengthM", "Length overall (m)", "number"],
  ["owner", "Lead engineer", "text"],
] as const;

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAccount();
  const memberships = useMemberships();
  const organizations = memberships.data?.filter((m) => permits(m.role, 'engineer')) ?? [];
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const values = {
      vessel: String(d.get("vessel")), type: String(d.get("type")), classSociety: String(d.get("classSociety")),
      flag: String(d.get("flag")), lengthM: Number(d.get("lengthM")), owner: String(d.get("owner")),
    };
    setBusy(true);
    try {
    let id: string;
    if (user) {
      const { data, error } = await supabase.rpc('create_engineering_project', { _organization_id: String(d.get('organization')), _vessel: values.vessel, _vessel_type: values.type, _class_society: values.classSociety, _flag: values.flag, _length_m: values.lengthM, _lead_engineer: values.owner });
      if (error) throw error;
      id = data;
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    } else id = addProject(values);
    setOpen(false);
    toast.success('Project created', { description: user ? 'Saved to your private workspace.' : 'Demonstration project — this session only.' });
    navigate({ to: "/projects/$projectId", params: { projectId: id } });
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Project could not be saved.'); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!user || !organizations.length} className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" />New project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New engineering project</DialogTitle>
          <DialogDescription>{user ? 'Private project in your engineering workspace.' : 'Demonstration project. Sign in to save real projects.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label htmlFor="project-organization">Organization</Label><select id="project-organization" name="organization" required className="mt-1 h-9 w-full rounded-sm border bg-card px-3 text-sm">{organizations.map((m) => <option key={m.organization_id} value={m.organization_id}>{m.organizations.name}</option>)}</select></div>
          {FIELDS.map(([name, label, type]) => (
            <div key={name} className="space-y-1">
              <Label htmlFor={name} className="label-tech">{label}</Label>
              <Input id={name} name={name} type={type} step="0.1" min={type === 'number' ? '0.1' : undefined} required />
            </div>
          ))}
          <DialogFooter className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create project'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
