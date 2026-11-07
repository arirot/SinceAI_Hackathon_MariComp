import { supabase } from '@/integrations/supabase/client';
import type { useEngineering } from './engineering';

type Eng = NonNullable<ReturnType<typeof useEngineering>['data']>;

/** Builds an auditable compliance dossier from stored records only; nothing is generated or inferred. */
export async function downloadAssessmentReport(data: Eng, assessmentId: string) {
  const a = data.assessments.find((x) => x.id === assessmentId);
  if (!a) throw new Error('Assessment not found.');
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const reviews = await supabase.from('engineering_reviews').select('finding_id,decision,rationale,created_at,reviewer_id').eq('assessment_id', a.id).order('created_at');
  if (reviews.error) throw reviews.error;
  const reviewerIds = [...new Set((reviews.data ?? []).map((r) => r.reviewer_id))];
  const names = reviewerIds.length ? (await supabase.from('profiles').select('id,full_name').in('id', reviewerIds)).data ?? [] : [];
  const project = data.projects.find((p) => p.id === a.project_id);
  const version = data.versions.find((v) => v.id === a.design_version_id);
  const source = data.sources.find((s) => s.id === a.regulatory_source_id);
  const findings = data.findings.filter((f) => f.assessment_id === a.id);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const navy: [number, number, number] = [16, 37, 66];
  doc.setFillColor(...navy); doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(15); doc.text('MariComp · Compliance Assessment Dossier', 12, 12);
  doc.setFontSize(8); doc.text(`Report RPT-${a.id.slice(0, 8).toUpperCase()} · generated ${new Date().toISOString()}`, 12, 19);
  doc.setTextColor(0, 0, 0);
  autoTable(doc, { startY: 32, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: navy }, head: [['Particular', 'Value']], body: [
    ['Project / vessel', `${project?.name ?? ''} · ${project?.vessel ?? ''}`],
    ['Type · class · flag · length', `${project?.vessel_type ?? ''} · ${project?.class_society ?? ''} · ${project?.flag ?? ''} · ${project?.length_m ?? ''} m`],
    ['Lead engineer', project?.lead_engineer ?? ''],
    ['Design version', `${version?.design_documents?.title ?? ''} · Rev ${version?.revision ?? ''} · v${version?.version_number ?? ''} (${a.design_version_id})`],
    ['Rule set', `${source?.title ?? ''} · ${source?.regulation_number ?? ''} · ${a.rule_set_version}`],
    ['Legal edition / source', `${source?.legal_version ?? ''} · ${source?.source_url ?? ''}`],
    ['Engine', `${a.engine_version ?? ''} · completed ${a.completed_at ?? 'not completed'}`],
    ['Overall deterministic outcome', a.overall_status],
    ['Findings', `${findings.length} total · ${findings.filter((f) => f.deterministic_status === 'COMPLIANT').length} compliant · ${findings.filter((f) => f.deterministic_status === 'NON_COMPLIANT').length} non-compliant · ${findings.filter((f) => f.deterministic_status === 'REQUIRES_REVIEW').length} require review`],
  ] });
  autoTable(doc, { theme: 'grid', styles: { fontSize: 7, cellPadding: 1.5 }, headStyles: { fillColor: navy }, columnStyles: { 0: { cellWidth: 34 }, 1: { cellWidth: 22 }, 2: { cellWidth: 62 } },
    head: [['Requirement', 'Status', 'Evidence (measured vs required)', 'Recommendation / review']],
    body: findings.map((f) => {
      const ev = data.evidence.filter((e) => e.finding_id === f.id).map((e) => {
        const t = e.threshold as { operator?: string; source_threshold?: string } | null;
        return `${e.rule_outcome ? `[${e.rule_outcome.toUpperCase()}] ${e.design_interpretations?.element_name ?? ''} ${e.measured_value} ${e.measured_unit} (${e.measured_mm} mm) ${t?.operator} ${t?.source_threshold}; ` : ''}p.${e.page_number ?? '?'} "${e.source_quote.slice(0, 140)}" (${e.verified ? 'engineer-verified' : 'unverified'})`;
      }).join('\n') || 'Missing evidence';
      const rv = (reviews.data ?? []).filter((r) => r.finding_id === f.id).map((r) => `Review ${r.decision} by ${names.find((n) => n.id === r.reviewer_id)?.full_name ?? r.reviewer_id} ${r.created_at.slice(0, 10)}: ${r.rationale}`).join('\n');
      return [`${f.title}\n${f.regulatory_requirements?.requirement_text?.slice(0, 260) ?? ''}`, f.deterministic_status, ev, `${f.recommendation ?? ''}${rv ? `\n${rv}` : '\nNo engineering review recorded.'}`];
    }),
    didParseCell: (c) => { if (c.section === 'body' && c.column.index === 1) c.cell.styles.textColor = c.cell.raw === 'NON_COMPLIANT' ? [190, 30, 30] : c.cell.raw === 'COMPLIANT' ? [20, 120, 70] : [170, 100, 0]; },
  });
  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  const page = y > 250 ? (doc.addPage(), 20) : y;
  doc.setFontSize(9); doc.text('Engineering sign-off', 12, page);
  doc.setFontSize(8);
  doc.text('Reviewed by (name, qualification): ______________________________   Signature: ______________   Date: __________', 12, page + 8);
  doc.text('Approved by (name, qualification): ______________________________   Signature: ______________   Date: __________', 12, page + 16);
  doc.setTextColor(110, 110, 110); doc.setFontSize(7);
  doc.text(doc.splitTextToSize('Decision-support output only — not an official certification, class approval or flag-state acceptance. Statuses are set by deterministic rules from verified regulatory records and engineer-verified evidence; AI interpretation never sets compliance status. Missing or unverified evidence is reported as REQUIRES_REVIEW.', 186), 12, page + 26);
  doc.save(`MariComp-RPT-${a.id.slice(0, 8)}.pdf`);
}
