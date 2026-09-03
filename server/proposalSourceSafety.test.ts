import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const proposalSource = readFileSync(resolve(import.meta.dirname, "proposalRouter.ts"), "utf8");

describe("proposal source-safety contract", () => {
  it("uses the approved aggregate workbook loader instead of client dashboard performance fixtures", () => {
    expect(proposalSource).toContain("loadTerritoryWorkbookAggregate");
    expect(proposalSource).toContain("TERRITORY_CATALOG");
    expect(proposalSource).not.toContain("DASHBOARD_DATA");
    expect(proposalSource).not.toContain("total_revenue");
    expect(proposalSource).not.toContain("total_jobs");
  });

  it("uses the internal model path and labels unavailable or partial workbook context", () => {
    expect(proposalSource).toContain('model: "gpt-5.5"');
    expect(proposalSource).not.toContain("api.anthropic.com");
    expect(proposalSource).toContain("Sales context is unavailable and must not be inferred");
    expect(proposalSource).toContain("conversion is unavailable pending an approved status definition");
  });
});
