import { useQuery } from '@tanstack/react-query';
import { useAccount } from './account';
import { supabase } from '@/integrations/supabase/client';

export function useEngineering() {
  const { user } = useAccount();
  return useQuery({ queryKey: ['engineering', user?.id], enabled: !!user, queryFn: async () => {
    const [assessments, findings, versions, sources, projects, evidence] = await Promise.all([
      supabase.from('compliance_assessments').select('*').order('created_at', { ascending: false }),
      supabase.from('compliance_findings').select('*,regulatory_requirements(clause_reference,requirement_text,category,deterministic_rule,required_evidence)').order('created_at', { ascending: false }),
      supabase.from('design_versions').select('id,project_id,revision,version_number,storage_path,mime_type,original_filename,design_documents(title)'),
      supabase.from('regulatory_sources').select('id,title,publisher,regulation_number,legal_version,rule_set_version,source_url,status,verified_at'),
      supabase.from('projects').select('id,name,organization_id,vessel,vessel_type,class_society,flag,length_m,lead_engineer'),
      supabase.from('assessment_evidence').select('finding_id,page_number,source_quote,verified,design_version_id,measured_value,measured_unit,measured_mm,threshold,rule_outcome,design_interpretations(element_name,element_type,deck,location,region)'),
    ]);
    for (const result of [assessments, findings, versions, sources, projects, evidence]) if (result.error) throw result.error;
    return { assessments: assessments.data ?? [], findings: findings.data ?? [], versions: versions.data ?? [], sources: sources.data ?? [], projects: projects.data ?? [], evidence: evidence.data ?? [] };
  }});
}