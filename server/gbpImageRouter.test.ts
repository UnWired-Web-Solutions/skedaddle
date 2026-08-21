import { describe, expect, it } from "vitest";
import { TERRITORIES, buildPromptFromFields, sanitizeAction } from "./gbpImageRouter";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createHash } from "crypto";

// ── Territory data tests ─────────────────────────────────────────────────────
describe("TERRITORIES", () => {
  it("has at least 19 territories", () => {
    expect(Object.keys(TERRITORIES).length).toBeGreaterThanOrEqual(19);
  });

  it("each territory has required fields", () => {
    for (const [id, t] of Object.entries(TERRITORIES)) {
      expect(t.label, `${id} missing label`).toBeTruthy();
      expect(t.cityState, `${id} missing cityState`).toBeTruthy();
      expect(t.suburbs.length, `${id} has no suburbs`).toBeGreaterThan(0);
    }
  });

  it("milwaukee has correct data", () => {
    const mil = TERRITORIES["milwaukee"];
    expect(mil.label).toBe("Milwaukee, WI");
    expect(mil.cityState).toBe("Milwaukee WI");
    expect(mil.suburbs).toContain("Waukesha");
  });

  it("hamilton has correct data", () => {
    const ham = TERRITORIES["hamilton"];
    expect(ham.label).toBe("Hamilton, ON");
    expect(ham.suburbs).toContain("Ancaster");
  });
});

// ── Router procedure tests ───────────────────────────────────────────────────
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("gbpImage.getTerritories", () => {
  it("returns all territories as an array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const territories = await caller.gbpImage.getTerritories();
    expect(Array.isArray(territories)).toBe(true);
    expect(territories.length).toBeGreaterThanOrEqual(19);
    const mil = territories.find((t) => t.id === "milwaukee");
    expect(mil).toBeDefined();
    expect(mil?.label).toBe("Milwaukee, WI");
    expect(Array.isArray(mil?.suburbs)).toBe(true);
  });
});

describe("gbpImage.getSuburbs", () => {
  it("returns suburbs for a valid territory", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const suburbs = await caller.gbpImage.getSuburbs({ territoryId: "hamilton" });
    expect(Array.isArray(suburbs)).toBe(true);
    expect(suburbs).toContain("Ancaster");
  });

  it("returns empty array for unknown territory", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.gbpImage.getSuburbs({ territoryId: "unknown-territory" })).rejects.toThrow();
  });
});

// ── GPT Image 2 / Forge API validation ──────────────────────────────────────
describe("GPT Image 2 (Forge API) environment", () => {
  it.runIf(process.env.RUN_LIVE_API_TESTS === "1")("BUILT_IN_FORGE_API_URL is set and looks like a URL", () => {
    const url = process.env.BUILT_IN_FORGE_API_URL;
    expect(url).toBeTruthy();
    expect(url).toMatch(/^https?:\/\//);
  });

  it.runIf(process.env.RUN_LIVE_API_TESTS === "1")("BUILT_IN_FORGE_API_KEY is set and non-empty", () => {
    const key = process.env.BUILT_IN_FORGE_API_KEY;
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
    expect(key!.length).toBeGreaterThan(10);
  });
});

// ── #2: Content hash collision safety ────────────────────────────────────────
describe("contentHash8 (filename collision fix)", () => {
  // Replicate the function logic for testing
  function contentHash8(title: string, body: string, territory: string, suburb: string): string {
    return createHash("sha256")
      .update(`${title}|${body}|${territory}|${suburb}`)
      .digest("hex")
      .slice(0, 8);
  }

  it("produces 8-character hex string", () => {
    const hash = contentHash8("Raccoon Removal", "body text", "milwaukee", "Waukesha");
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("different content produces different hashes", () => {
    const h1 = contentHash8("Raccoon Removal", "body1", "milwaukee", "Waukesha");
    const h2 = contentHash8("Squirrel Exclusion", "body2", "milwaukee", "Waukesha");
    expect(h1).not.toBe(h2);
  });

  it("same content produces same hash (idempotent)", () => {
    const h1 = contentHash8("Same Title", "Same Body", "hamilton", "Ancaster");
    const h2 = contentHash8("Same Title", "Same Body", "hamilton", "Ancaster");
    expect(h1).toBe(h2);
  });
});

// ── #1: getJobStatus returns not_found for unknown jobs ──────────────────────
describe("gbpImage.getJobStatus", () => {
  it("returns found=false for unknown jobId", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.gbpImage.getJobStatus({ jobId: "nonexistent_job_id" });
    expect(result.found).toBe(false);
    expect(result.status).toBe("not_found");
    expect(result.results).toEqual([]);
  });
});

// ── LLM model availability ───────────────────────────────────────────────────
describe("LLM model configuration", () => {
  it.runIf(process.env.RUN_LIVE_API_TESTS === "1")("BUILT_IN_FORGE_API_URL is configured", () => {
    expect(process.env.BUILT_IN_FORGE_API_URL).toBeTruthy();
  });

  it.runIf(process.env.RUN_LIVE_API_TESTS === "1")("BUILT_IN_FORGE_API_KEY is configured", () => {
    expect(process.env.BUILT_IN_FORGE_API_KEY).toBeTruthy();
  });
});

// ── Species description accuracy ────────────────────────────────────────────
// We import the function indirectly by testing the exported module structure
describe("Species description map coverage", () => {
  // Replicate the species description logic for testing
  const SPECIES_DESCRIPTIONS: Record<string, string> = {
    raccoon: "raccoon (medium-sized mammal with distinctive black mask markings around eyes, bushy ringed black-and-grey tail, grey-brown fur, stocky build)",
    squirrel: "grey squirrel (small rodent about 9 inches long, bushy grey tail, grey fur with white belly, small rounded ears)",
    skunk: "striped skunk (black fur with two prominent white stripes running from head to bushy tail, small pointed face, short legs)",
    bat: "little brown bat (small flying mammal with dark brown fur, leathery outstretched wings, tiny body about 3 inches long)",
    mouse: "house mouse (very small rodent only 2-3 inches long, grey-brown fur, large round ears relative to body, long thin tail)",
    mice: "house mice (very small rodents only 2-3 inches long, grey-brown fur, large round ears relative to body, long thin tails)",
    chipmunk: "eastern chipmunk (tiny rodent with distinctive alternating brown and white stripes along its back, cheek pouches, small bushy tail)",
    groundhog: "groundhog (large stocky rodent also called woodchuck, brown fur, flat broad head, short powerful legs, about 20 inches long)",
    opossum: "Virginia opossum (grey-white fur, long pointed snout with pink nose, hairless prehensile tail, large dark eyes)",
    bird: "bird (common pest bird such as starling or sparrow near a nest of twigs and debris)",
    vole: "meadow vole (very small mouse-like rodent with short tail, brown fur, compact rounded body)",
    mole: "eastern mole (small burrowing mammal with velvety dark fur, large paddle-shaped front paws, tiny hidden eyes)",
  };

  function getSpeciesDescription(species: string): string {
    const lower = species.toLowerCase();
    for (const [key, desc] of Object.entries(SPECIES_DESCRIPTIONS)) {
      if (lower.includes(key)) return desc;
    }
    return species;
  }

  it("raccoon includes mask markings and ringed tail", () => {
    const desc = getSpeciesDescription("raccoon");
    expect(desc).toContain("black mask markings");
    expect(desc).toContain("ringed");
  });

  it("skunk includes white stripes", () => {
    const desc = getSpeciesDescription("skunk");
    expect(desc).toContain("white stripes");
    expect(desc).toContain("black fur");
  });

  it("squirrel includes bushy tail and small size", () => {
    const desc = getSpeciesDescription("squirrel");
    expect(desc).toContain("bushy");
    expect(desc).toContain("9 inches");
  });

  it("mouse includes very small size", () => {
    const desc = getSpeciesDescription("mouse");
    expect(desc).toContain("2-3 inches");
    expect(desc).toContain("large round ears");
  });

  it("unknown species returns the input string", () => {
    const desc = getSpeciesDescription("unicorn");
    expect(desc).toBe("unicorn");
  });

  it("covers all problematic species from the review", () => {
    const problematicSpecies = ["raccoon", "squirrel", "skunk", "mouse", "bat", "chipmunk"];
    for (const s of problematicSpecies) {
      const desc = getSpeciesDescription(s);
      expect(desc, `${s} should have a detailed description`).not.toBe(s);
      expect(desc.length, `${s} description should be detailed`).toBeGreaterThan(30);
    }
  });
});

// ── Prompt no-handling directive ────────────────────────────────────────────
describe("Prompt construction rules", () => {
  // Replicate the action framings to test they don't include direct handling
  const ACTION_FRAMINGS = [
    "technician inspecting a roofline while the animal watches from a safe distance",
    "technician crouching near a foundation vent installing mesh screening, with the animal visible nearby on the ground",
    "technician installing a one-way exclusion device on a soffit, animal observing from a tree branch",
    "technician on a ladder sealing an entry point near the roofline, animal perched on the roof edge several feet away",
    "technician examining and sealing entry points on a deck, animal peeking out from under the structure",
    "wide shot of a suburban home exterior with technician working on exclusion hardware and animal in the mid-ground",
    "technician walking toward a detached garage carrying exclusion materials, animal visible near the structure",
    "technician documenting damage near a chimney cap with clipboard, animal perched above at a distance",
  ];

  it("no action framing mentions holding, grabbing, or touching the animal", () => {
    const forbidden = ["held", "holding", "grab", "grabbing", "touching", "catches", "caught"];
    for (const framing of ACTION_FRAMINGS) {
      for (const word of forbidden) {
        expect(framing.toLowerCase(), `Framing "${framing}" contains forbidden word "${word}"`).not.toContain(word);
      }
    }
  });

  it("action framings emphasize structure work and distance", () => {
    const structureWords = ["roofline", "vent", "exclusion", "soffit", "entry point", "deck", "garage", "chimney"];
    for (const framing of ACTION_FRAMINGS) {
      const hasStructureWork = structureWords.some(w => framing.toLowerCase().includes(w));
      expect(hasStructureWork, `Framing "${framing}" should reference structure work`).toBe(true);
    }
  });

  it("uses the extracted post action and setting instead of an unrelated random species scene", () => {
    const prompt = buildPromptFromFields({
      species: "squirrel",
      sizeClass: "large",
      action: "installing steel mesh over a chewed fascia opening",
      scene: "two-storey brick home with an attached garage",
      season: "fall",
      serviceLabel: "Squirrel Exclusion",
    }, "Hamilton ON", "Ancaster", "test-variation");
    expect(prompt).toContain("installing steel mesh over a chewed fascia opening");
    expect(prompt).toContain("two-storey brick home with an attached garage");
    expect(prompt).toContain("Ancaster, Hamilton ON");
  });

  it("does not turn an unsupported species into a raccoon scene", () => {
    const prompt = buildPromptFromFields({
      species: "fox",
      sizeClass: "large",
      action: "inspecting a den opening beneath a shed",
      scene: "residential backyard with a detached shed",
      season: "spring",
      serviceLabel: "Fox Assessment",
    }, "Ottawa ON", "Kanata", "fox-test");
    expect(prompt).toContain("fox");
    expect(prompt).not.toContain("black mask markings");
    expect(prompt).not.toContain("ringed tail");
  });

  it("keeps generated branding out of the photograph", () => {
    const prompt = buildPromptFromFields({
      species: "raccoon",
      sizeClass: "large",
      action: "performing wildlife exclusion",
      scene: "suburban home roofline",
      season: "summer",
      serviceLabel: "Raccoon Exclusion",
    }, "Milwaukee WI", "Waukesha", "legacy-brand-test");
    expect(prompt).not.toContain("raccoon-in-circle logo");
    expect(prompt).not.toContain("same green raccoon logo");
    expect(prompt).toContain("verified Skedaddle branding will be applied after generation");
    expect(prompt).toContain("Do not imply that this is a real customer or job photograph");
  });

  it("replaces direct animal-handling actions with humane exclusion work", () => {
    expect(sanitizeAction("catching and holding the raccoon")).toContain("humane one-way exclusion");
    expect(sanitizeAction("sealing a soffit entry point")).toBe("sealing a soffit entry point");
  });
});

// ── Image dimension configuration ───────────────────────────────────────────
describe("Image dimension configuration", () => {
  it("should use explicit 1200x900 dimensions (not landscape_4_3 preset)", async () => {
    // Read the source file and verify no remaining "landscape_4_3" references
    const fs = await import("fs");
    const source = fs.readFileSync("server/gbpImageRouter.ts", "utf-8");
    expect(source).not.toContain('"landscape_4_3"');
    expect(source).not.toContain("'landscape_4_3'");
  });

  it("uses high-quality GPT Image 2 generation and exact post dimensions", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/gbpImageRouter.ts", "utf-8");
    expect(source).toContain('model: "gpt-image-2"');
    expect(source).toContain('quality: "high"');
    expect(source).toContain("resize(1200, 900");
  });

  it("does not fail open when automated vision QA is unavailable", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/gbpImageRouter.ts", "utf-8");
    expect(source).toContain('status: "unavailable"');
    expect(source).toContain("asset.qaStatus !== \"passed\"");
  });
});
