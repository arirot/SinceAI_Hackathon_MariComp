import { useSyncExternalStore } from "react";
import { DEMO_PROJECTS, type Project } from "./demo-data";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from './account';

// In-memory store for the demo interface. Resets on reload until Lovable Cloud is connected.
let projects: Project[] = DEMO_PROJECTS;
const listeners = new Set<() => void>();

export function addProject(p: Omit<Project, "id" | "updated" | "version">) {
  const id = `PRJ-${String(150 + projects.length).padStart(4, "0")}`;
  projects = [{ ...p, id, version: "Rev A", updated: new Date().toISOString().slice(0, 10) }, ...projects];
  listeners.forEach((l) => l());
  return id;
}

export function useProjects() {
  const { user, loading } = useAccount();
  const demo = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => projects,
    () => DEMO_PROJECTS,
  );
  const query = useQuery({ queryKey: ['projects', user?.id], enabled: !!user, queryFn: async (): Promise<Project[]> => {
    const { data, error } = await supabase.from('projects').select('*, vessels!projects_vessel_organization_fk(name,vessel_type,class_society,flag,length_m)').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((p) => ({ id: p.id, organizationId: p.organization_id, vessel: p.vessels.name, type: p.vessels.vessel_type, classSociety: p.vessels.class_society, flag: p.vessels.flag, lengthM: p.vessels.length_m, owner: p.lead_engineer, version: p.version, updated: p.updated_at.slice(0,10) }));
  }});
  if (query.error) throw query.error;
  return loading ? [] : user ? query.data ?? [] : demo;
}
