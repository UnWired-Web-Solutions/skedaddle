import { describe, expect, it } from "vitest";
import { parseCsvRows, parseGbpCsv, resolveTerritoryId } from "./gbpCsv";

const territories = [
  { id: "milwaukee", label: "Milwaukee, WI" },
  { id: "hamilton", label: "Hamilton, ON" },
  { id: "durham", label: "Durham Region, ON" },
];

describe("GBP CSV parsing", () => {
  it("preserves quoted commas, escaped quotes, and newlines", () => {
    const rows = parseCsvRows(`title,body
"Raccoons, roofs","A ""safe"" approach
for homes"`);
    expect(rows[1]).toEqual(["Raccoons, roofs", 'A "safe" approach\nfor homes']);
  });

  it("resolves territory IDs, full labels, and unique city labels", () => {
    expect(resolveTerritoryId("milwaukee", territories)).toBe("milwaukee");
    expect(resolveTerritoryId("Hamilton, ON", territories)).toBe("hamilton");
    expect(resolveTerritoryId("Durham Region", territories)).toBe("durham");
  });

  it("rejects unknown territories instead of silently generating generic images", () => {
    const result = parseGbpCsv("post_title,territory\nRaccoon removal,Atlantis", territories);
    expect(result.posts).toHaveLength(0);
    expect(result.errors[0]?.message).toContain("Unknown territory");
  });

  it("parses valid scheduling data", () => {
    const result = parseGbpCsv('post_title,post_body,territory,suburb,scheduled_for\n"Squirrel, attic","Heard scratching, then called us",Hamilton,Ancaster,2026-09-07', territories);
    expect(result.errors).toEqual([]);
    expect(result.posts[0]).toMatchObject({
      title: "Squirrel, attic",
      body: "Heard scratching, then called us",
      territory: "hamilton",
      suburb: "Ancaster",
      scheduledFor: "2026-09-07",
    });
  });

  it("rejects impossible calendar dates", () => {
    const result = parseGbpCsv(
      "post_title,territory,scheduled_for\nRaccoon removal,milwaukee,2026-02-31",
      territories,
    );
    expect(result.posts).toHaveLength(0);
    expect(result.errors[0]?.message).toContain("real date");
  });
});
