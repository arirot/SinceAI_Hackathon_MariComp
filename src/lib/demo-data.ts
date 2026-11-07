/**
 * DEMONSTRATION DATA ONLY.
 * Fictional vessels, documents and findings for interface preview.
 * Regulatory references name real instruments at chapter/annex level only;
 * no clause numbers are given and none are verified.
 */
import { resolveFindingStatus, type FindingStatus } from "./compliance";

export interface Project {
  id: string; vessel: string; type: string; classSociety: string;
  version: string; flag: string; lengthM: number; owner: string; updated: string; organizationId?: string;
}
export const DEMO_PROJECTS: Project[] = [
  { id: "PRJ-0142", vessel: "MV Northern Tern (demo)", type: "Bulk carrier", classSociety: "Demo Class A", version: "Rev C", flag: "Demo flag", lengthM: 189.9, owner: "A. Okafor", updated: "2026-11-04" },
  { id: "PRJ-0137", vessel: "MT Coral Ridge (demo)", type: "Product tanker", classSociety: "Demo Class B", version: "Rev B", flag: "Demo flag", lengthM: 183.0, owner: "L. Hansen", updated: "2026-11-02" },
  { id: "PRJ-0129", vessel: "PSV Atlantic Spur (demo)", type: "Offshore supply", classSociety: "Demo Class A", version: "Rev A", flag: "Demo flag", lengthM: 87.4, owner: "R. Mendes", updated: "2026-10-28" },
  { id: "PRJ-0118", vessel: "RoPax Harbour Light (demo)", type: "Ro-Ro passenger", classSociety: "Demo Class C", version: "Rev D", flag: "Demo flag", lengthM: 142.6, owner: "S. Ito", updated: "2026-10-19" },
];

export interface DesignDocument {
  id: string; projectId: string; title: string; kind: string; revision: string;
  pages: number; extraction: "Extracted" | "Pending" | "Failed"; uploaded: string;
}
export const DEMO_DOCUMENTS: DesignDocument[] = [
  { id: "DOC-881", projectId: "PRJ-0142", title: "General Arrangement Plan", kind: "Drawing", revision: "C", pages: 4, extraction: "Extracted", uploaded: "2026-11-04" },
  { id: "DOC-879", projectId: "PRJ-0142", title: "Fire Control Plan", kind: "Drawing", revision: "B", pages: 6, extraction: "Extracted", uploaded: "2026-11-03" },
  { id: "DOC-874", projectId: "PRJ-0142", title: "Intact Stability Booklet", kind: "Calculation", revision: "C", pages: 112, extraction: "Pending", uploaded: "2026-11-03" },
  { id: "DOC-862", projectId: "PRJ-0137", title: "Cargo Tank Arrangement", kind: "Drawing", revision: "B", pages: 3, extraction: "Extracted", uploaded: "2026-11-01" },
  { id: "DOC-855", projectId: "PRJ-0137", title: "Machinery Space Specification", kind: "Specification", revision: "A", pages: 38, extraction: "Failed", uploaded: "2026-10-30" },
  { id: "DOC-840", projectId: "PRJ-0129", title: "Lightship Weight Estimate", kind: "Calculation", revision: "A", pages: 21, extraction: "Extracted", uploaded: "2026-10-27" },
];

export interface RegulatorySource {
  id: string; instrument: string; part: string; topic: string; edition: string;
  verified: boolean; verifiedBy: string | null;
}
export const DEMO_REGULATIONS: RegulatorySource[] = [
  { id: "REG-01", instrument: "SOLAS", part: "Chapter II-2", topic: "Fire protection, detection and extinction", edition: "To be confirmed", verified: true, verifiedBy: "Demo reviewer" },
  { id: "REG-02", instrument: "MARPOL", part: "Annex I", topic: "Prevention of pollution by oil", edition: "To be confirmed", verified: true, verifiedBy: "Demo reviewer" },
  { id: "REG-03", instrument: "International Convention on Load Lines", part: "—", topic: "Freeboard and conditions of assignment", edition: "To be confirmed", verified: false, verifiedBy: null },
  { id: "REG-04", instrument: "IS Code", part: "Part A", topic: "Intact stability criteria", edition: "To be confirmed", verified: true, verifiedBy: "Demo reviewer" },
  { id: "REG-05", instrument: "Classification rules", part: "Hull structure", topic: "Society-specific — not loaded", edition: "—", verified: false, verifiedBy: null },
];

export interface Finding {
  id: string; assessmentId: string; projectId: string; requirement: string;
  sourceId: string; evidence: string | null; ruleResult: "pass" | "fail" | null;
  recommendation: string; reviewer: string | null; decision: "Pending" | "Accepted" | "Overridden";
}
const RAW_FINDINGS: Finding[] = [
  { id: "F-3011", assessmentId: "ASM-221", projectId: "PRJ-0142", requirement: "Fire control plan present for all decks", sourceId: "REG-01", evidence: "DOC-879 p.1–6", ruleResult: "pass", recommendation: "None.", reviewer: "A. Okafor", decision: "Accepted" },
  { id: "F-3012", assessmentId: "ASM-221", projectId: "PRJ-0142", requirement: "Escape route marking shown on GA", sourceId: "REG-01", evidence: "DOC-881 p.2", ruleResult: "fail", recommendation: "Add escape route annotation to accommodation deck on GA.", reviewer: null, decision: "Pending" },
  { id: "F-3013", assessmentId: "ASM-221", projectId: "PRJ-0142", requirement: "Intact stability loading conditions documented", sourceId: "REG-04", evidence: null, ruleResult: null, recommendation: "Upload extracted stability booklet; extraction pending.", reviewer: null, decision: "Pending" },
  { id: "F-3014", assessmentId: "ASM-221", projectId: "PRJ-0142", requirement: "Freeboard assignment data provided", sourceId: "REG-03", evidence: "DOC-881 p.1", ruleResult: "pass", recommendation: "Source not verified — engineer must confirm.", reviewer: null, decision: "Pending" },
  { id: "F-2987", assessmentId: "ASM-218", projectId: "PRJ-0137", requirement: "Slop tank arrangement identified", sourceId: "REG-02", evidence: "DOC-862 p.2", ruleResult: "pass", recommendation: "None.", reviewer: "L. Hansen", decision: "Accepted" },
  { id: "F-2988", assessmentId: "ASM-218", projectId: "PRJ-0137", requirement: "Oil discharge monitoring equipment specified", sourceId: "REG-02", evidence: null, ruleResult: null, recommendation: "Machinery specification extraction failed; re-upload.", reviewer: null, decision: "Pending" },
  { id: "F-2989", assessmentId: "ASM-218", projectId: "PRJ-0137", requirement: "Cargo tank protective location dimensions", sourceId: "REG-02", evidence: "DOC-862 p.1", ruleResult: "fail", recommendation: "Dimensions on drawing below rule input threshold; verify against source.", reviewer: "L. Hansen", decision: "Pending" },
  { id: "F-2950", assessmentId: "ASM-210", projectId: "PRJ-0129", requirement: "Lightship data consistent with stability input", sourceId: "REG-04", evidence: "DOC-840 p.3", ruleResult: "pass", recommendation: "None.", reviewer: "R. Mendes", decision: "Accepted" },
];

export type FindingWithStatus = Finding & { status: FindingStatus };
export const DEMO_FINDINGS: FindingWithStatus[] = RAW_FINDINGS.map((f) => ({
  ...f,
  status: resolveFindingStatus({
    ruleResult: f.ruleResult,
    hasEvidence: !!f.evidence,
    hasVerifiedSource: !!DEMO_REGULATIONS.find((r) => r.id === f.sourceId)?.verified,
  }),
}));

export interface Assessment { id: string; projectId: string; scope: string; run: string; by: string }
export const DEMO_ASSESSMENTS: Assessment[] = [
  { id: "ASM-221", projectId: "PRJ-0142", scope: "Fire safety, stability, load line", run: "2026-11-04 14:20", by: "A. Okafor" },
  { id: "ASM-218", projectId: "PRJ-0137", scope: "Oil pollution prevention", run: "2026-11-02 09:05", by: "L. Hansen" },
  { id: "ASM-210", projectId: "PRJ-0129", scope: "Intact stability", run: "2026-10-28 16:40", by: "R. Mendes" },
];

export const DEMO_ACTIVITY = [
  { at: "2026-11-04 14:32", who: "A. Okafor", what: "Ran assessment ASM-221 on PRJ-0142" },
  { at: "2026-11-04 11:10", who: "A. Okafor", what: "Uploaded General Arrangement Plan Rev C" },
  { at: "2026-11-03 17:45", who: "L. Hansen", what: "Accepted finding F-2987" },
  { at: "2026-11-03 09:22", who: "S. Ito", what: "Created design version Rev D for PRJ-0118" },
  { at: "2026-11-02 09:05", who: "L. Hansen", what: "Ran assessment ASM-218 on PRJ-0137" },
];

export const findingsFor = (pred: (f: FindingWithStatus) => boolean) => DEMO_FINDINGS.filter(pred);
export const countStatus = (list: FindingWithStatus[], s: FindingStatus) => list.filter((f) => f.status === s).length;
