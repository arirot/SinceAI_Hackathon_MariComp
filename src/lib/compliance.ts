/**
 * Core compliance domain vocabulary shared by UI and (later) server rule engine.
 * A finding can only be COMPLIANT when deterministic rules pass with verified
 * evidence and a verified regulatory source. Anything missing => REQUIRES_REVIEW.
 */
export const FINDING_STATUSES = [
  "COMPLIANT",
  "NON_COMPLIANT",
  "REQUIRES_REVIEW",
  "NOT_EVALUATED",
] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export interface FindingInput {
  ruleResult: "pass" | "fail" | null;
  hasEvidence: boolean;
  hasVerifiedSource: boolean;
}

/** Deterministic status resolution. AI output never sets status directly. */
export function resolveFindingStatus(f: FindingInput): FindingStatus {
  if (!f.hasVerifiedSource || !f.hasEvidence) return "REQUIRES_REVIEW";
  if (f.ruleResult === null) return "NOT_EVALUATED";
  return f.ruleResult === "pass" ? "COMPLIANT" : "NON_COMPLIANT";
}

/** A vessel is never declared compliant overall while any finding is open. */
export function resolveOverallStatus(statuses: FindingStatus[]): FindingStatus {
  if (statuses.length === 0) return "NOT_EVALUATED";
  if (statuses.includes("NON_COMPLIANT")) return "NON_COMPLIANT";
  if (statuses.some((s) => s !== "COMPLIANT")) return "REQUIRES_REVIEW";
  return "COMPLIANT";
}

export function pageHead(title: string, description: string) {
  const full = `${title} · MariComp`;
  return {
    meta: [
      { title: full },
      { name: "description", content: description },
      { property: "og:title", content: full },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
