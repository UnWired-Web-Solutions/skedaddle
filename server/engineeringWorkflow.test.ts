import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const agentsSource = readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8");
const projectContext = readFileSync(
  new URL("../PROJECT_ENGINEERING_CONTEXT.md", import.meta.url),
  "utf8"
);
const taskContractTemplate = readFileSync(
  new URL("../TASK_CONTRACT_TEMPLATE.md", import.meta.url),
  "utf8"
);

describe("project engineering workflow", () => {
  it("keeps the project-specific workflow discoverable from repository instructions", () => {
    expect(agentsSource).toContain("PROJECT_ENGINEERING_CONTEXT.md");
    expect(agentsSource).toContain("TASK_CONTRACT_TEMPLATE.md");
  });

  it("preserves source, authentication, currency, and partial-data guardrails", () => {
    expect(projectContext).toContain("Google Drive workbook is the active Salesforce-derived source");
    expect(projectContext).toContain("Never combine CAD and USD");
    expect(projectContext).toContain("signed, HTTP-only, 12-hour session");
    expect(projectContext).toContain("Franchise sessions may read only their configured territory");
    expect(projectContext).toContain("Record partial coverage and source failures");
  });

  it("keeps high-risk work explicit about authority and verification evidence", () => {
    expect(taskContractTemplate).toContain("Database migration or backfill");
    expect(taskContractTemplate).toContain("Production runtime verification");
  });
});
