import { describe, it, expect } from "vitest";
import { resolveFindingStatus, resolveOverallStatus } from "@/lib/compliance";

describe("compliance status rules", () => {
  it("missing evidence requires review even if rule passes", () => {
    expect(resolveFindingStatus({ ruleResult: "pass", hasEvidence: false, hasVerifiedSource: true })).toBe("REQUIRES_REVIEW");
  });
  it("unverified source requires review", () => {
    expect(resolveFindingStatus({ ruleResult: "pass", hasEvidence: true, hasVerifiedSource: false })).toBe("REQUIRES_REVIEW");
  });
  it("vessel not compliant overall with any open finding", () => {
    expect(resolveOverallStatus(["COMPLIANT", "REQUIRES_REVIEW"])).toBe("REQUIRES_REVIEW");
    expect(resolveOverallStatus([])).toBe("NOT_EVALUATED");
  });
});
