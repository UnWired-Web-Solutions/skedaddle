import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import sharp from "sharp";
import { storagePut } from "./storage";
import { createHash } from "crypto";
import pLimit from "p-limit";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ENV } from "./_core/env";
import { and, desc, eq } from "drizzle-orm";
import { gbpImageAssets, gbpImageJobs } from "../drizzle/schema";
import { getDb } from "./db";

// ── Logo PNG loading (module scope, loaded once) ────────────────────────────
// Place the real Skedaddle logo at: server/assets/skedaddle-logo.png
// Must be a transparent PNG. It will be composited into the brand bar.
const __filename_local = fileURLToPath(import.meta.url);
const __dirname_local = dirname(__filename_local);
const LOGO_PATH = resolve(__dirname_local, "assets", "skedaddle-logo.png");
const DEFAULT_LOGO_URL = "https://www.skedaddlewildlife.com/wp-content/uploads/2021/02/skedaddle-logo.png";
let logoPngBuffer: Buffer | null = null;
let remoteLogoPromise: Promise<Buffer | null> | null = null;
try {
  if (existsSync(LOGO_PATH)) {
    logoPngBuffer = readFileSync(LOGO_PATH);
  }
} catch {
  // Logo not available — will use text fallback
}

async function getOfficialLogoBuffer(): Promise<Buffer | null> {
  if (logoPngBuffer) return logoPngBuffer;
  if (remoteLogoPromise) return remoteLogoPromise;

  remoteLogoPromise = (async () => {
    try {
      const logoUrl = process.env.SKEDADDLE_LOGO_URL || DEFAULT_LOGO_URL;
      const response = await fetch(logoUrl, { signal: AbortSignal.timeout(8_000) });
      if (!response.ok) return null;
      const candidate = Buffer.from(await response.arrayBuffer());
      const meta = await sharp(candidate).metadata();
      if (!meta.width || !meta.height) return null;
      logoPngBuffer = await sharp(candidate).png().toBuffer();
      return logoPngBuffer;
    } catch {
      return null;
    }
  })();

  const resolvedLogo = await remoteLogoPromise;
  // A transient network failure should not disable branded approvals until the
  // next process restart. Successful fetches remain cached in logoPngBuffer.
  if (!resolvedLogo) remoteLogoPromise = null;
  return resolvedLogo;
}

// ── Territory data ────────────────────────────────────────────────────────────
export const TERRITORIES: Record<string, { label: string; cityState: string; suburbs: string[] }> = {
  milwaukee:          { label: "Milwaukee, WI",        cityState: "Milwaukee WI",        suburbs: ["Waukesha","Brookfield","New Berlin","Hartland","Wauwatosa","Greenfield","Pewaukee","West Allis","Franklin","Delafield","Oconomowoc","Menomonee Falls"] },
  madison:            { label: "Madison, WI",           cityState: "Madison WI",           suburbs: ["Middleton","Verona","Fitchburg","Waunakee","Oregon","McFarland","Stoughton","Sun Prairie","Mazomanie","Monona"] },
  hamilton:           { label: "Hamilton, ON",           cityState: "Hamilton ON",           suburbs: ["Ancaster","Dundas","Stoney Creek","Waterdown","Grimsby","Binbrook","Caledonia","Flamborough","Dunnville","Hagersville"] },
  durham:             { label: "Durham Region, ON",     cityState: "Durham Region ON",     suburbs: ["Whitby","Ajax","Pickering","Oshawa","Bowmanville","Port Perry","Brooklin","Courtice","Uxbridge","Scugog"] },
  minneapolis:        { label: "Minneapolis, MN",       cityState: "Minneapolis MN",       suburbs: ["Eden Prairie","Minnetonka","Bloomington","Plymouth","Edina","Maple Grove","Woodbury","Burnsville","Eagan","Lakeville"] },
  coquitlam:          { label: "Coquitlam, BC",         cityState: "Coquitlam BC",         suburbs: ["Port Moody","Burnaby","New Westminster","Maple Ridge","Pitt Meadows","Port Coquitlam","Langley","Surrey","Abbotsford","Mission"] },
  "md-baltimore":     { label: "Baltimore, MD",         cityState: "Baltimore MD",         suburbs: ["Towson","Catonsville","Ellicott City","Pikesville","Timonium","Owings Mills","Parkville","Dundalk","Rosedale","Essex"] },
  "atlanta-north":    { label: "Atlanta North, GA",    cityState: "Atlanta GA",           suburbs: ["Alpharetta","Roswell","Marietta","Sandy Springs","Dunwoody","Johns Creek","Smyrna","Kennesaw","Woodstock","Canton"] },
  ottawa:             { label: "Ottawa, ON",            cityState: "Ottawa ON",            suburbs: ["Kanata","Barrhaven","Orleans","Nepean","Gloucester","Stittsville","Manotick","Riverside South","Rockcliffe","Aylmer"] },
  montreal:           { label: "Montreal, QC",          cityState: "Montreal QC",          suburbs: ["Laval","Longueuil","Brossard","Saint-Lambert","Verdun","Westmount","Outremont","Pointe-Claire","Dollard-des-Ormeaux","Beaconsfield"] },
  london:             { label: "London, ON",            cityState: "London ON",            suburbs: ["Byron","Westmount","Lambeth","Komoka","Strathroy","St. Thomas","Dorchester","Ingersoll","Tillsonburg","Woodstock"] },
  "co-denver":        { label: "Denver, CO",            cityState: "Denver CO",            suburbs: ["Aurora","Lakewood","Arvada","Westminster","Thornton","Centennial","Highlands Ranch","Parker","Littleton","Englewood"] },
  orangeville:        { label: "Orangeville, ON",       cityState: "Orangeville ON",       suburbs: ["Shelburne","Grand Valley","Mono","Amaranth","East Garafraxa"] },
  "oh-columbus":      { label: "Columbus, OH",          cityState: "Columbus OH",          suburbs: ["Dublin","Westerville","Gahanna","Hilliard","Grove City","Pickerington","Reynoldsburg","Powell","Lewis Center","New Albany"] },
  "pa-pittsburgh":    { label: "Pittsburgh, PA",        cityState: "Pittsburgh PA",        suburbs: ["Mt. Lebanon","Bethel Park","Upper St. Clair","Peters Township","Cranberry Township","Wexford","Monroeville","Ross Township","McCandless","Hampton Township"] },
  okanagan:           { label: "Okanagan, BC",          cityState: "Kelowna BC",           suburbs: ["West Kelowna","Penticton","Vernon","Summerland","Peachland"] },
  "l-windsor":        { label: "Windsor, ON",           cityState: "Windsor ON",           suburbs: ["LaSalle","Tecumseh","Lakeshore","Amherstburg","Essex","Kingsville","Leamington","Chatham","Tilbury","Wallaceburg"] },
  "barrie-north":     { label: "Barrie North, ON",     cityState: "Barrie ON",            suburbs: ["Innisfil","Angus","Orillia","Midland","Penetanguishene","Collingwood","Wasaga Beach","Alliston","Bradford","Newmarket"] },
  "maryland-central": { label: "Maryland Central",     cityState: "Annapolis MD",         suburbs: ["Severna Park","Arnold","Crofton","Odenton","Pasadena","Glen Burnie","Millersville","Gambrills","Davidsonville","Edgewater"] },
};

// ── Utility: content hash for dedup and collision-safe filenames ─────────────
function contentHash8(title: string, body: string, territory: string, suburb: string): string {
  return createHash("sha256")
    .update(`${title}|${body}|${territory}|${suburb}`)
    .digest("hex")
    .slice(0, 8);
}

// ── Utility: ASCII-safe slug ────────────────────────────────────────────────
function toAsciiSlug(s: string, maxLen = 40): string {
  return s.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLen);
}

// ── Species size classification ─────────────────────────────────────────────
const SMALL_ANIMALS = ["mouse", "mice", "bat", "bats", "vole", "voles", "chipmunk", "chipmunks", "mole", "moles", "shrew", "shrews"];
const LARGE_ANIMALS = ["raccoon", "raccoons", "squirrel", "squirrels", "opossum", "opossums", "groundhog", "groundhogs", "fox", "foxes", "coyote", "coyotes", "deer", "skunk", "skunks"];

function classifyAnimalSize(species: string): "small" | "large" | "unknown" {
  const lower = species.toLowerCase();
  if (SMALL_ANIMALS.some(a => lower.includes(a))) return "small";
  if (LARGE_ANIMALS.some(a => lower.includes(a))) return "large";
  return "unknown";
}

// ── Species physical description map (for prompt accuracy) ──────────────────
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

// ── #4+#5+#6: Structured-intermediate prompt builder ────────────────────────
// Step 1: LLM extracts structured fields from post content
// Step 2: Deterministic template assembles the final GPT Image 2 prompt
export interface ExtractedFields {
  species: string;
  sizeClass: "small" | "large" | "unknown";
  action: string;
  scene: string;
  season: string;
  serviceLabel: string;
}

async function extractFieldsFromPost(
  title: string,
  body: string,
  territory: string,
  suburb: string,
): Promise<ExtractedFields> {
  const territoryData = TERRITORIES[territory];
  const cityState = territoryData?.cityState ?? territory;
  const suburbText = suburb || (territoryData?.suburbs[0] ?? cityState);

  const systemPrompt = `You are a wildlife service data extractor for Skedaddle Humane Wildlife Control.
Given a GBP post title and body, extract structured fields. Do not write a prompt — just extract facts.

The post is about a job in ${suburbText}, ${cityState}.

Return JSON with these fields:
- species: the primary animal mentioned (e.g. "raccoon", "squirrel", "bat", "mouse")
- sizeClass: "small" if the animal is tiny (mouse, bat, vole, chipmunk, mole, shrew), "large" if bigger (raccoon, squirrel, skunk, opossum, groundhog), or "unknown"
- action: what the technician is doing (e.g. "installing one-way door on soffit", "sealing entry points on roofline", "removing nest from attic")
- scene: brief description of the setting (e.g. "two-story colonial home with mature trees", "ranch-style house with attached garage")
- season: the season implied by the post (spring, summer, fall, winter) — infer from context clues
- serviceLabel: short label for the service (e.g. "Raccoon Removal", "Squirrel Exclusion", "Bat Exclusion", "Mouse Removal")`;

  const result = await invokeLLM({
    model: "gpt-5.6",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Title: ${title}\n\nBody: ${body || "(no body provided)"}` },
    ],
    responseFormat: {
      type: "json_schema" as const,
      json_schema: {
        name: "extracted_fields",
        strict: true,
        schema: {
          type: "object",
          properties: {
            species: { type: "string" },
            sizeClass: { type: "string", enum: ["small", "large", "unknown"] },
            action: { type: "string" },
            scene: { type: "string" },
            season: { type: "string" },
            serviceLabel: { type: "string" },
          },
          required: ["species", "sizeClass", "action", "scene", "season", "serviceLabel"],
          additionalProperties: false,
        },
      },
    },
  });
  console.log(`[GBP] LLM extraction raw response:`, JSON.stringify(result.choices[0]?.message?.content).slice(0, 200));

  try {
    const rawContent = result.choices[0]?.message?.content;
    const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(contentStr);
    // Validate/override sizeClass using our known list
    const correctedSize = classifyAnimalSize(parsed.species);
    return {
      species: parsed.species || "wildlife",
      sizeClass: correctedSize !== "unknown" ? correctedSize : (parsed.sizeClass || "unknown"),
      action: parsed.action || "performing wildlife exclusion",
      scene: parsed.scene || "suburban residential home",
      season: parsed.season || "summer",
      serviceLabel: parsed.serviceLabel || "Wildlife Removal",
    };
  } catch (err) {
    console.error(`[GBP] extractFieldsFromPost FAILED for title="${title}":`, err instanceof Error ? err.message : err);
    // Fallback: try to extract species directly from the title
    const titleLower = title.toLowerCase();
    let fallbackSpecies = "wildlife";
    let fallbackSize: "small" | "large" | "unknown" = "unknown";
    for (const [key] of Object.entries(SPECIES_DESCRIPTIONS)) {
      if (titleLower.includes(key)) {
        fallbackSpecies = key;
        fallbackSize = classifyAnimalSize(key);
        break;
      }
    }
    console.log(`[GBP] Using fallback species from title: ${fallbackSpecies}`);
    return {
      species: fallbackSpecies,
      sizeClass: fallbackSize,
      action: "performing wildlife exclusion",
      scene: "suburban residential home",
      season: "summer",
      serviceLabel: `${fallbackSpecies.charAt(0).toUpperCase() + fallbackSpecies.slice(1)} Removal`,
    };
  }
}

export function sanitizeAction(action: string): string {
  const normalized = action.trim() || "performing humane wildlife exclusion";
  const directHandling = /\b(catch(?:ing)?|captur(?:e|ing)|grab(?:bing)?|hold(?:ing)?|trap(?:ping)?|kill(?:ing)?|poison(?:ing)?|touch(?:ing)?)\b/i;
  if (directHandling.test(normalized)) {
    return "inspecting the wildlife entry point and installing a humane one-way exclusion device";
  }
  return normalized;
}

// Step 2: Deterministic template builds the final prompt from extracted fields
export function buildPromptFromFields(
  fields: ExtractedFields,
  cityState: string,
  suburbText: string,
  variationKey = "default",
): string {
  const { species, action, scene, season } = fields;

  // Season-specific lighting
  const seasonLighting: Record<string, string> = {
    spring: "soft overcast spring light, fresh green foliage",
    summer: "warm golden-hour summer light, lush green trees",
    fall: "warm autumn light, colorful fall foliage",
    winter: "cool crisp winter light, bare branches",
  };
  const lighting = seasonLighting[season.toLowerCase()] || seasonLighting.summer;

  // Get detailed species description for accurate rendering
  const speciesDesc = getSpeciesDescription(species);
  const speciesName = species.toLowerCase().trim();

  // STRATEGY: Realistic wildlife control job photos.
  // The technician and animal are in the SAME frame — this is what real job photos look like.
  // The tech is working at/near the entry point. The animal is visible nearby.
  // The tech's hands are on tools/building materials — not grabbing the animal.
  // Think: "coworker took this photo on their phone during the job."

  // Realistic job scenarios per species (tech + animal in same frame)
  const jobScenes: Record<string, string[]> = {
    raccoon: [
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, black baseball cap with the same green raccoon logo, and black work gloves, kneeling on a residential roof installing steel mesh over a soffit gap. A raccoon with black mask markings and ringed tail is peeking out from the adjacent soffit opening, watching the technician work",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, black baseball cap with the same green raccoon logo, and black work gloves, on a ladder inspecting a damaged roof vent on a suburban home. A raccoon is visible sitting on the roof ridge nearby, looking at the technician",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, black baseball cap with the same green raccoon logo, and black work gloves, installing a one-way exclusion door on a chimney cap. A raccoon is climbing out of the chimney opening as the device is being fitted",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, black baseball cap with the same green raccoon logo, and black work gloves, crouching beside a backyard deck, shining a flashlight underneath. A raccoon's face is visible under the deck, eyes reflecting the light",
    ],
    squirrel: [
      "A wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, black cap with the same logo, on a ladder screwing steel mesh over a chewed hole in a home's fascia board. A grey squirrel is perched on a nearby tree branch watching",
      "A wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, black cap with the same logo, on a residential roof replacing a damaged plastic vent with a metal one. A squirrel is sitting on the gutter edge a few feet away",
      "A wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, black cap with the same logo, inspecting attic insulation with a flashlight. A squirrel is visible in the corner of the attic near its nest of shredded material",
      "A wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, black cap with the same logo, installing a one-way door over a gap in a home's soffit. A squirrel is on the roof nearby, looking at the work being done",
    ],
    bat: [
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo on a ladder at dusk, installing fine mesh exclusion netting over a gap between roof shingles and fascia. Several small brown bats are visible emerging from the gap",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo in a dim attic space, pointing a flashlight at a cluster of small brown bats hanging from the rafters overhead",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo on a ladder inspecting the exterior of a brick building at twilight. A bat is clinging to the wall near a vent opening",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo installing a bat valve (one-way exit device) over a gap in a home's soffit. Bats are visible roosting in the gap behind the device",
    ],
    skunk: [
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo crouching near a home's foundation, installing a one-way exclusion door at a gap under the porch. A black and white striped skunk is visible under the porch watching",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo kneeling beside a garden shed, digging a trench to install underground mesh. A striped skunk is walking away across the lawn nearby",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo with a flashlight, inspecting under a residential deck. A skunk with distinctive black fur and white stripe is visible underneath",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo sealing a foundation gap with steel mesh. A skunk is visible nearby on the lawn, watching from a safe distance",
    ],
    mouse: [
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo crouching at a home's foundation, sealing a small crack with steel wool and caulk. A tiny house mouse is visible peeking out from a nearby gap in the siding",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo in a garage, inspecting insulation along the wall. A small mouse is visible sitting on a shelf nearby",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo installing a metal kick plate at the base of a door. A mouse is visible near the corner of the room",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo checking a monitoring station placed along a garage wall. A small mouse is visible near the baseboard",
    ],
    mice: [
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo crouching at a home's foundation, sealing a small crack with steel wool and caulk. A tiny house mouse is visible peeking out from a nearby gap in the siding",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo in a garage, inspecting insulation along the wall. A small mouse is visible sitting on a shelf nearby",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo installing a metal kick plate at the base of a door. A mouse is visible near the corner of the room",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo checking a monitoring station placed along a garage wall. A small mouse is visible near the baseboard",
    ],
    bird: [
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo on a ladder, installing a bird-proof vent cover over a dryer vent. A bird is perched on the gutter nearby with nesting material in its beak",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo inspecting a bathroom exhaust vent on the exterior of a home. A bird's nest is visible inside the vent opening",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo on a roof, fitting mesh over a gap where birds have been entering. A starling is sitting on the roof ridge watching",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo carefully removing old nesting material from a vent opening. A bird is perched on a nearby branch watching",
    ],
    chipmunk: [
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo kneeling at a front porch, installing mesh along the foundation. A chipmunk with brown stripes is sitting on the porch step nearby",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo digging a shallow trench beside a home's foundation to install exclusion mesh. A chipmunk is peeking out from a hole in the garden nearby",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo sealing gaps around a home's downspout base. A chipmunk is perched on a nearby retaining wall watching",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo inspecting burrow holes near a residential walkway. A chipmunk is visible sitting upright near one of the holes",
    ],
    groundhog: [
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo installing an L-shaped wire mesh barrier along a garden fence line. A groundhog is sitting upright in the yard nearby, watching",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo kneeling beside a shed, installing a one-way door at a burrow entrance. A groundhog is visible near the edge of the yard",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo digging a trench for underground exclusion fencing. A groundhog is peeking out from its burrow hole a few feet away",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo inspecting groundhog damage to a residential garden. A groundhog is visible sitting at the far end of the yard",
    ],
    opossum: [
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo on a ladder, installing mesh over a gap under a home's eaves. An opossum with grey fur and a pink nose is visible on a nearby tree branch",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo crouching beside a deck, installing a one-way door. An opossum is visible underneath the deck looking out",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo shining a flashlight under a porch at night. An opossum's face is visible in the beam of light",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo sealing gaps along a home's foundation. An opossum is visible walking along the fence line in the background",
    ],
    snake: [
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo sealing a gap in a home's foundation with expanding foam. A snake is visible coiled near the base of the wall",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo installing mesh over a basement window well. A snake is visible inside the window well",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo inspecting the exterior siding of a home. A snake is visible in the garden bed below",
      "A Skedaddle wildlife technician wearing a bright lime-green polo shirt with a small raccoon-in-circle logo on the left chest, black work pants, and black baseball cap with the same green raccoon logo checking a gap under a garage door. A snake is visible nearby on the driveway",
    ],
  };

  const canonicalSpecies = Object.keys(jobScenes).find((key) =>
    speciesName === key || speciesName.includes(key) || key.includes(speciesName),
  );
  const speciesScenes = canonicalSpecies ? jobScenes[canonicalSpecies] : [];
  const sceneHash = createHash("sha256")
    .update(`${speciesName}|${action}|${scene}|${suburbText}|${variationKey}`)
    .digest("hex");
  const sceneIndex = speciesScenes.length > 0
    ? Number.parseInt(sceneHash.slice(0, 8), 16) % speciesScenes.length
    : 0;
  const fallbackScene = `A Skedaddle humane wildlife technician in a bright lime-green polo, black work pants, black work gloves, and a black cap, ${sanitizeAction(action)} at ${scene}. A ${speciesDesc} is clearly visible nearby at a biologically realistic size and safe distance`;
  const composedSceneWithLegacyBrandCues = action && action !== "performing wildlife exclusion"
    ? fallbackScene
    : (speciesScenes[sceneIndex] || fallbackScene);
  // Older scene templates described a small uniform logo. Image models render
  // logos unreliably, so strip those cues and add the verified logo afterward.
  const composedScene = composedSceneWithLegacyBrandCues
    .replace(/ with a small raccoon-in-circle logo on the left chest/gi, "")
    .replace(/ with the same green raccoon logo/gi, "")
    .replace(/ with the same logo/gi, "");

  // Build a natural-looking prompt. The extracted post action and setting are
  // authoritative; species templates only provide a fallback composition.
  const prompt = [
    `${composedScene}.`,
    `Suburban residential home in ${suburbText}, ${cityState}.`,
    `${lighting}.`,
    `The source post setting is ${scene}; preserve that property type and service context.`,
    `The technician's hands are holding tools or working on building materials only. The animal is not trapped, touched, held, grabbed, injured, distressed, or placed in an implausible pose.`,
    `Photorealistic editorial illustration with a candid field-photography composition. Natural lighting, realistic anatomy and tools, professional and not posed or staged. Do not imply that this is a real customer or job photograph.`,
    `The ${speciesName} is clearly identifiable as a ${speciesDesc}.`,
    `Do not generate readable text, watermarks, or imitation logos inside the photograph; verified Skedaddle branding will be applied after generation.`,
  ].join(" ");

  return prompt;
}

// ── Combined prompt builder (replaces old buildPromptFromPost) ───────────────
async function buildPrompt(
  title: string,
  body: string,
  territory: string,
  suburb: string,
  variationKey = "default",
): Promise<{ prompt: string; serviceLabel: string; fields: ExtractedFields }> {
  const territoryData = TERRITORIES[territory];
  const cityState = territoryData?.cityState ?? territory;
  const suburbText = suburb || (territoryData?.suburbs[0] ?? cityState);

  const fields = await extractFieldsFromPost(title, body, territory, suburb);
  const prompt = buildPromptFromFields(fields, cityState, suburbText, variationKey);

  return { prompt, serviceLabel: fields.serviceLabel, fields };
}

export interface ImageQAResult {
  status: "passed" | "failed" | "unavailable";
  correctSpecies: boolean;
  animalVisible: boolean;
  humaneInteraction: boolean;
  realisticAnatomy: boolean;
  professionalQuality: boolean;
  settingMatches: boolean;
  confidence: "high" | "medium" | "low";
  actualSpecies: string;
  qualityScore: number;
  issues: string[];
}

// ── Vision QA: species, humane treatment, realism, and professional fit ─────
async function visionQACheck(
  imageUrl: string,
  species: string,
  scene: string,
): Promise<ImageQAResult> {
  const speciesDesc = getSpeciesDescription(species);
  try {
    const result = await invokeLLM({
      model: "gemini-3-flash-preview",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `Review this AI-generated image for a Skedaddle Humane Wildlife Control GBP post. It must be safe for an internal reviewer to approve, but it must never be presented as a documentary customer/job photo.

The intended animal is a ${species}. Identifying features: ${speciesDesc}.
The intended service setting is: ${scene}.

Check all of the following and answer with JSON:
- correctSpecies: the animal is clearly the intended species
- animalVisible: the animal is clearly visible at a biologically plausible scale
- humaneInteraction: no person is touching, holding, grabbing, trapping, injuring, or distressing the animal
- realisticAnatomy: animals, people, hands, tools, rooflines, and building details are anatomically/structurally plausible
- professionalQuality: photorealistic, credible, appropriately composed, and free of gibberish text, fake watermarks, or distorted logos
- settingMatches: the scene is consistent with the intended service setting and a North American residential property
- confidence: high, medium, or low
- actualSpecies: best identification of the animal shown
- qualityScore: integer from 1 to 10
- issues: concrete problems an image generator should correct; empty array only when no problem is visible` },
          { type: "image_url", image_url: { url: imageUrl, detail: "auto" } },
        ],
      }],
      responseFormat: {
        type: "json_schema" as const,
        json_schema: {
          name: "vision_qa",
          schema: {
            type: "object",
            properties: {
              correctSpecies: { type: "boolean" },
              animalVisible: { type: "boolean" },
              humaneInteraction: { type: "boolean" },
              realisticAnatomy: { type: "boolean" },
              professionalQuality: { type: "boolean" },
              settingMatches: { type: "boolean" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              actualSpecies: { type: "string" },
              qualityScore: { type: "integer", minimum: 1, maximum: 10 },
              issues: { type: "array", items: { type: "string" } },
            },
            required: ["correctSpecies", "animalVisible", "humaneInteraction", "realisticAnatomy", "professionalQuality", "settingMatches", "confidence", "actualSpecies", "qualityScore", "issues"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const rawContent = result.choices[0]?.message?.content;
    const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(contentStr);
    const passed = parsed.correctSpecies === true
      && parsed.animalVisible === true
      && parsed.humaneInteraction === true
      && parsed.realisticAnatomy === true
      && parsed.professionalQuality === true
      && parsed.settingMatches === true
      && parsed.confidence !== "low"
      && Number(parsed.qualityScore) >= 7;

    return {
      status: passed ? "passed" : "failed",
      correctSpecies: parsed.correctSpecies === true,
      animalVisible: parsed.animalVisible === true,
      humaneInteraction: parsed.humaneInteraction === true,
      realisticAnatomy: parsed.realisticAnatomy === true,
      professionalQuality: parsed.professionalQuality === true,
      settingMatches: parsed.settingMatches === true,
      confidence: parsed.confidence,
      actualSpecies: String(parsed.actualSpecies || "unknown"),
      qualityScore: Number(parsed.qualityScore || 0),
      issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
    };
  } catch (error) {
    return {
      status: "unavailable",
      correctSpecies: false,
      animalVisible: false,
      humaneInteraction: false,
      realisticAnatomy: false,
      professionalQuality: false,
      settingMatches: false,
      confidence: "low",
      actualSpecies: "unverified",
      qualityScore: 0,
      issues: [`Automated QA unavailable: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

// ── #7: Add brand overlay using sharp's Pango text rendering ────────────────
// Uses sharp's built-in text() method which renders via Pango/fontconfig.
// This is font-independent — works on any server without requiring specific fonts.
// IMPORTANT: All text buffers are clamped to fit within the image width to prevent
// "Image to composite must have same dimensions or smaller" errors.
async function addBrandOverlay(
  imageBuffer: Buffer,
  serviceLabel: string,
  cityState: string,
): Promise<{ buffer: Buffer; brandAsset: "official_logo" | "text_fallback" }> {
  const meta = await sharp(imageBuffer).metadata();
  const W = meta.width ?? 1200;
  const H = meta.height ?? 900;
  const barH = Math.round(H * 0.14);
  const barY = H - barH;
  const textX = Math.round(W * 0.04);
  const maxTextWidth = W - textX * 2; // max width for any text buffer
  const fontSize = Math.round(H * 0.045);
  const fontSizeSmall = Math.round(H * 0.028);

  // Helper: clamp a rendered text buffer to fit within maxW pixels
  async function clampTextWidth(buf: Buffer, maxW: number): Promise<Buffer> {
    const m = await sharp(buf).metadata();
    if ((m.width ?? 0) > maxW) {
      return await sharp(buf).resize({ width: maxW, fit: "inside" }).png().toBuffer();
    }
    return buf;
  }

  // Create the Skedaddle green bar as a separate RGBA buffer
  const brandBar = await sharp({
    create: { width: W, height: barH, channels: 4, background: { r: 122, g: 193, b: 67, alpha: 230 } },
  }).png().toBuffer();

  // Render service label text using Pango (font-independent)
  let serviceLabelBuf: Buffer = await sharp({
    text: {
      text: `<span foreground="white" font_desc="Sans Bold ${fontSize}">${escapePango(serviceLabel)}</span>`,
      dpi: 72,
      rgba: true,
    },
  }).png().toBuffer();
  serviceLabelBuf = await clampTextWidth(serviceLabelBuf, maxTextWidth - 200); // leave room for Skedaddle
  const serviceMeta = await sharp(serviceLabelBuf).metadata();

  // Render city/state text
  let cityBuf: Buffer = await sharp({
    text: {
      text: `<span foreground="#C8EBEB" font_desc="Sans ${fontSizeSmall}">${escapePango(cityState)}</span>`,
      dpi: 72,
      rgba: true,
    },
  }).png().toBuffer();
  cityBuf = await clampTextWidth(cityBuf, maxTextWidth - 200);

  // Calculate text positions within the bar
  const textYBase = barY + Math.round(barH * 0.25);
  const serviceHeight = serviceMeta.height ?? fontSize;

  // Build composite layers
  const composites: Array<{ input: Buffer; top: number; left: number; blend: "over" }> = [
    { input: brandBar, top: barY, left: 0, blend: "over" },
    { input: serviceLabelBuf, top: textYBase, left: textX, blend: "over" },
    { input: cityBuf, top: textYBase + serviceHeight + 4, left: textX, blend: "over" },
  ];

  // Brand mark: either the real logo PNG or rendered "Skedaddle" text
  const officialLogo = await getOfficialLogoBuffer();
  if (officialLogo) {
    const logoHeight = Math.round(barH * 0.6);
    const resizedLogo = await sharp(officialLogo)
      .resize({ height: logoHeight, fit: "inside" })
      .toBuffer();
    const logoMeta = await sharp(resizedLogo).metadata();
    const logoWidth = logoMeta.width ?? logoHeight * 3;
    const logoLeft = W - Math.round(W * 0.04) - logoWidth;
    const logoTop = barY + Math.round((barH - logoHeight) / 2);
    const platePaddingX = 12;
    const platePaddingY = 8;
    const logoPlate = await sharp({
      create: {
        width: logoWidth + platePaddingX * 2,
        height: logoHeight + platePaddingY * 2,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 235 },
      },
    }).png().toBuffer();
    composites.push({
      input: logoPlate,
      top: Math.max(barY, logoTop - platePaddingY),
      left: Math.max(0, logoLeft - platePaddingX),
      blend: "over",
    });
    composites.push({ input: resizedLogo, top: logoTop, left: logoLeft, blend: "over" });
  } else {
    // Render "Skedaddle" brand text
    const brandFontSize = Math.round(H * 0.038);
    let brandBuf: Buffer = await sharp({
      text: {
        text: `<span foreground="white" font_desc="Sans Bold ${brandFontSize}">Skedaddle</span>`,
        dpi: 72,
        rgba: true,
      },
    }).png().toBuffer();
    brandBuf = await clampTextWidth(brandBuf, Math.round(W * 0.25));
    const brandMeta = await sharp(brandBuf).metadata();
    const brandWidth = brandMeta.width ?? 150;
    const brandHeight = brandMeta.height ?? brandFontSize;
    const brandLeft = W - Math.round(W * 0.04) - brandWidth;
    const brandTop = barY + Math.round((barH - brandHeight) / 2);
    composites.push({ input: brandBuf, top: brandTop, left: brandLeft, blend: "over" });
  }

  const buffer = await sharp(imageBuffer)
    .composite(composites)
    .jpeg({ quality: 92 })
    .toBuffer();
  return { buffer, brandAsset: officialLogo ? "official_logo" : "text_fallback" };
}

// Escape text for Pango markup (XML-like)
function escapePango(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── Generate image via OpenAI API directly (user's own key) ───────────────────
async function generateImageViaGPT(prompt: string): Promise<Buffer> {
  const openaiKey = process.env.OPENAI_API_KEY;

  // Primary: use user's own OpenAI API key directly
  if (openaiKey) {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt,
        n: 1,
        size: "1536x1024",
        quality: "high",
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenAI image generation failed (${response.status}): ${detail.slice(0, 200)}`);
    }

    const result = (await response.json()) as { data: Array<{ b64_json: string }> };
    if (!result.data?.[0]?.b64_json) {
      throw new Error("OpenAI returned no image data");
    }
    return Buffer.from(result.data[0].b64_json, "base64");
  }

  // Fallback: use built-in forge API
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    throw new Error("Neither OPENAI_API_KEY nor BUILT_IN_FORGE_API_URL configured for image generation");
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL("images.v1.ImageService/GenerateImage", baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      prompt,
      original_images: [],
      model: "MODEL_GPT_IMAGE_2",
      quality: "high",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`GPT Image 2 generation failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const result = (await response.json()) as { image: { b64Json: string; mimeType: string } };
  return Buffer.from(result.image.b64Json, "base64");
}

export interface GeneratedImageResult {
  assetId: number | null;
  url: string;
  filename: string;
  serviceLabel: string;
  species: string;
  brandAsset: "official_logo" | "text_fallback";
  prompt: string;
  status: "draft";
  qa: ImageQAResult;
  generationAttempts: number;
  persisted: boolean;
}

interface GenerateOptions {
  variationKey?: string;
  generationJobId?: string;
  scheduledFor?: string;
}

async function generateSingleImage(
  title: string,
  body: string,
  territory: string,
  suburb: string,
  options: GenerateOptions = {},
): Promise<GeneratedImageResult> {
  const territoryData = TERRITORIES[territory];
  if (!territoryData) throw new Error(`Unknown territory: ${territory}`);
  const cityState = territoryData.cityState;
  const variationKey = options.variationKey || "default";
  const { prompt, serviceLabel, fields } = await buildPrompt(title, body, territory, suburb, variationKey);

  let finalPrompt = prompt;
  let rawBuffer: Buffer | null = null;
  let qa: ImageQAResult = {
    status: "unavailable",
    correctSpecies: false,
    animalVisible: false,
    humaneInteraction: false,
    realisticAnatomy: false,
    professionalQuality: false,
    settingMatches: false,
    confidence: "low",
    actualSpecies: "unverified",
    qualityScore: 0,
    issues: ["Image has not been checked"],
  };
  let generationAttempts = 0;

  // Generate and validate every candidate. The second retry is also validated;
  // no unreviewed final retry can silently become the returned image.
  for (let attempt = 0; attempt < 3; attempt++) {
    generationAttempts = attempt + 1;
    if (attempt > 0) {
      const corrections = qa.issues.length > 0 ? qa.issues.join("; ") : "improve species clarity and realism";
      finalPrompt = `${prompt} Regenerate a different composition and correct these review issues: ${corrections}. Keep the post action, setting, species, humane-treatment rules, and local context unchanged.`;
    }

    rawBuffer = await generateImageViaGPT(finalPrompt);
    const qaBuffer = await sharp(rawBuffer)
      .resize(1200, 900, { fit: "cover", position: "center" })
      .jpeg({ quality: 82 })
      .toBuffer();
    const qaDataUrl = `data:image/jpeg;base64,${qaBuffer.toString("base64")}`;
    qa = await visionQACheck(qaDataUrl, fields.species, fields.scene);
    console.log(`[GBP] QA attempt ${generationAttempts}: ${qa.status}, score=${qa.qualityScore}, species=${fields.species}`);
    if (qa.status === "passed" || qa.status === "unavailable") break;
  }

  if (!rawBuffer) throw new Error("Image generation returned no image");
  const resizedBuffer = await sharp(rawBuffer)
    .resize(1200, 900, { fit: "cover", position: "center" })
    .jpeg({ quality: 95 })
    .toBuffer();
  const displayLocation = suburb ? `${suburb}, ${cityState}` : cityState;
  const branded = await addBrandOverlay(resizedBuffer, serviceLabel, displayLocation);

  const hash8 = contentHash8(title, body, territory, suburb);
  const variant8 = createHash("sha256").update(`${variationKey}|${Date.now()}`).digest("hex").slice(0, 8);
  const slug = toAsciiSlug(title, 30) || "gbp-post";
  const safeTerritory = toAsciiSlug(territory, 20);
  const filename = `${safeTerritory}_${slug}_${hash8}_${variant8}.jpg`;
  const { url: storedUrl } = await storagePut(`gbp-images/${filename}`, branded.buffer, "image/jpeg");

  let assetId: number | null = null;
  const db = await getDb();
  if (db) {
    try {
      const sourceHash = createHash("sha256")
        .update(`${title}|${body}|${territory}|${suburb}`)
        .digest("hex");
      const [inserted] = await db.insert(gbpImageAssets).values({
        generationJobId: options.generationJobId || null,
        sourceHash,
        title,
        body: body || null,
        territoryId: territory,
        suburb: suburb || null,
        serviceLabel,
        species: fields.species,
        prompt: finalPrompt,
        imageUrl: storedUrl,
        filename,
        brandAsset: branded.brandAsset,
        status: "draft",
        qaStatus: qa.status,
        qaJson: JSON.stringify(qa),
        generationAttempts,
        scheduledFor: options.scheduledFor || null,
      });
      assetId = inserted.insertId;
    } catch (error) {
      console.error("[GBP] Generated image could not be persisted:", error);
    }
  }

  return {
    assetId,
    url: storedUrl,
    filename,
    serviceLabel,
    species: fields.species,
    brandAsset: branded.brandAsset,
    prompt: finalPrompt,
    status: "draft",
    qa,
    generationAttempts,
    persisted: assetId !== null,
  };
}

type BulkJobStatus = "pending" | "running" | "completed" | "partial" | "failed" | "interrupted";
interface BulkResult extends Omit<GeneratedImageResult, "status"> {
  index: number;
  status: "draft";
  success: boolean;
  error?: string;
}
interface BulkJob {
  id: string;
  status: BulkJobStatus;
  total: number;
  completed: number;
  failed: number;
  results: BulkResult[];
  createdAt: number;
  updatedAt: number;
  errorMessage?: string;
}

const jobStore = new Map<string, BulkJob>();

function cleanupOldJobs() {
  const oneHourAgo = Date.now() - 3600_000;
  jobStore.forEach((job, id) => {
    if (job.createdAt < oneHourAgo && !["pending", "running"].includes(job.status)) jobStore.delete(id);
  });
}

async function persistJob(job: BulkJob): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const values = {
    id: job.id,
    status: job.status,
    total: job.total,
    completed: job.completed,
    failed: job.failed,
    resultsJson: JSON.stringify(job.results),
    errorMessage: job.errorMessage || null,
  };
  await db.insert(gbpImageJobs).values(values).onDuplicateKeyUpdate({ set: values });
}

async function readPersistedJob(jobId: string): Promise<BulkJob | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(gbpImageJobs).where(eq(gbpImageJobs.id, jobId)).limit(1);
  if (!row) return null;
  let status = row.status as BulkJobStatus;
  const updatedAt = row.updatedAt?.getTime?.() ?? Date.now();
  if (["pending", "running"].includes(status) && Date.now() - updatedAt > 15 * 60_000) {
    status = "interrupted";
    await db.update(gbpImageJobs).set({ status }).where(eq(gbpImageJobs.id, jobId));
  }
  let results: BulkResult[] = [];
  if (row.resultsJson) {
    try {
      const parsed = JSON.parse(row.resultsJson);
      if (Array.isArray(parsed)) results = parsed as BulkResult[];
    } catch {
      status = "interrupted";
    }
  }
  return {
    id: row.id,
    status,
    total: row.total,
    completed: row.completed,
    failed: row.failed,
    results,
    createdAt: row.createdAt?.getTime?.() ?? updatedAt,
    updatedAt,
    errorMessage: row.errorMessage || undefined,
  };
}

const territoryIdSchema = z.string().trim().refine((id) => Boolean(TERRITORIES[id]), {
  message: "Select a recognized Skedaddle territory",
});
function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

const scheduledForSchema = z.string().refine(isIsoCalendarDate, {
  message: "Scheduled date must be a real calendar date in YYYY-MM-DD format",
}).optional();
const generationPostSchema = z.object({
  title: z.string().trim().min(1).max(255),
  body: z.string().max(5000).default(""),
  territory: territoryIdSchema,
  suburb: z.string().trim().max(128).default(""),
  scheduledFor: scheduledForSchema,
  variationKey: z.string().trim().max(64).optional(),
});

function parseStoredQa(value: string | null): ImageQAResult | null {
  if (!value) return null;
  try { return JSON.parse(value) as ImageQAResult; } catch { return null; }
}

export const gbpImageRouter = router({
  getTerritories: publicProcedure.query(() => Object.entries(TERRITORIES).map(([id, t]) => ({
    id,
    label: t.label,
    suburbs: t.suburbs,
  }))),

  getSuburbs: publicProcedure
    .input(z.object({ territoryId: territoryIdSchema }))
    .query(({ input }) => TERRITORIES[input.territoryId].suburbs),

  generateSingle: publicProcedure
    .input(generationPostSchema)
    .mutation(async ({ input }) => generateSingleImage(
      input.title,
      input.body,
      input.territory,
      input.suburb,
      { variationKey: input.variationKey, scheduledFor: input.scheduledFor },
    )),

  generateBulk: publicProcedure
    .input(z.object({ posts: z.array(generationPostSchema).min(1).max(50) }))
    .mutation(async ({ input }) => {
      cleanupOldJobs();
      const jobId = createHash("sha256")
        .update(JSON.stringify(input.posts) + Date.now())
        .digest("hex")
        .slice(0, 16);
      const job: BulkJob = {
        id: jobId,
        status: "running",
        total: input.posts.length,
        completed: 0,
        failed: 0,
        results: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      jobStore.set(jobId, job);
      await persistJob(job);

      const limit = pLimit(4);
      const byHash = new Map<string, Promise<GeneratedImageResult>>();
      let persistenceChain = Promise.resolve();
      const queuePersist = () => {
        const snapshot: BulkJob = { ...job, results: [...job.results] };
        persistenceChain = persistenceChain
          .catch((error) => { console.error("[GBP] Job persistence failed:", error); })
          .then(() => persistJob(snapshot));
        return persistenceChain;
      };
      const processAll = async () => {
        const tasks = input.posts.map(async (post, index) => {
          const hash = createHash("sha256")
            .update(`${post.title}|${post.body}|${post.territory}|${post.suburb}|${post.scheduledFor || ""}`)
            .digest("hex");
          let generation = byHash.get(hash);
          if (!generation) {
            generation = limit(() => generateSingleImage(
              post.title,
              post.body,
              post.territory,
              post.suburb,
              {
                variationKey: post.variationKey || hash.slice(0, 12),
                generationJobId: jobId,
                scheduledFor: post.scheduledFor,
              },
            ));
            byHash.set(hash, generation);
          }

          try {
            const result = await generation;
            job.results.push({ ...result, index, success: true });
          } catch (error) {
            job.failed++;
            job.results.push({
              index,
              assetId: null,
              url: "",
              filename: "",
              serviceLabel: "",
              species: "",
              brandAsset: "text_fallback",
              prompt: "",
              status: "draft",
              qa: {
                status: "unavailable",
                correctSpecies: false,
                animalVisible: false,
                humaneInteraction: false,
                realisticAnatomy: false,
                professionalQuality: false,
                settingMatches: false,
                confidence: "low",
                actualSpecies: "unverified",
                qualityScore: 0,
                issues: [String(error)],
              },
              generationAttempts: 0,
              persisted: false,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          } finally {
            job.completed++;
            job.updatedAt = Date.now();
            job.results.sort((a, b) => a.index - b.index);
            await queuePersist();
          }
        });

        await Promise.all(tasks);
        job.status = job.failed === 0 ? "completed" : job.failed === job.total ? "failed" : "partial";
        job.updatedAt = Date.now();
        await queuePersist();
      };

      processAll().catch(async (error) => {
        job.status = "failed";
        job.errorMessage = error instanceof Error ? error.message : String(error);
        job.updatedAt = Date.now();
        await queuePersist().catch(() => undefined);
      });

      return { jobId };
    }),

  getJobStatus: publicProcedure
    .input(z.object({ jobId: z.string().min(1).max(64) }))
    .query(async ({ input }) => {
      const job = jobStore.get(input.jobId) || await readPersistedJob(input.jobId);
      if (!job) {
        return { found: false as const, status: "not_found" as const, total: 0, completed: 0, failed: 0, results: [] };
      }
      return {
        found: true as const,
        status: job.status,
        total: job.total,
        completed: job.completed,
        failed: job.failed,
        results: job.results,
        errorMessage: job.errorMessage,
      };
    }),

  listAssets: publicProcedure
    .input(z.object({
      territoryId: territoryIdSchema.optional(),
      status: z.enum(["draft", "in_review", "approved", "rejected", "posted"]).optional(),
      limit: z.number().int().min(1).max(200).default(100),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { available: false as const, assets: [] };
      const limit = input?.limit ?? 100;
      const rows = input?.territoryId && input.status
        ? await db.select().from(gbpImageAssets).where(and(eq(gbpImageAssets.territoryId, input.territoryId), eq(gbpImageAssets.status, input.status))).orderBy(desc(gbpImageAssets.createdAt)).limit(limit)
        : input?.territoryId
          ? await db.select().from(gbpImageAssets).where(eq(gbpImageAssets.territoryId, input.territoryId)).orderBy(desc(gbpImageAssets.createdAt)).limit(limit)
          : input?.status
            ? await db.select().from(gbpImageAssets).where(eq(gbpImageAssets.status, input.status)).orderBy(desc(gbpImageAssets.createdAt)).limit(limit)
            : await db.select().from(gbpImageAssets).orderBy(desc(gbpImageAssets.createdAt)).limit(limit);
      return { available: true as const, assets: rows.map((asset) => ({ ...asset, qa: parseStoredQa(asset.qaJson) })) };
    }),

  updateAssetReview: publicProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["draft", "in_review", "approved", "rejected"]),
      reviewerName: z.string().trim().min(1).max(128),
      reviewerNotes: z.string().trim().max(2000).optional(),
      scheduledFor: scheduledForSchema.nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available; review state cannot be saved");
      const [asset] = await db.select().from(gbpImageAssets).where(eq(gbpImageAssets.id, input.id)).limit(1);
      if (!asset) throw new Error("Generated image not found");
      if (input.status === "approved" && asset.qaStatus !== "passed") {
        throw new Error("This image cannot be approved until automated QA passes");
      }
      if (input.status === "approved" && asset.brandAsset !== "official_logo") {
        throw new Error("This image cannot be approved because the official Skedaddle logo was unavailable");
      }
      await db.update(gbpImageAssets).set({
        status: input.status,
        reviewerNotes: input.reviewerNotes || null,
        reviewedBy: input.reviewerName,
        reviewedAt: new Date(),
        scheduledFor: input.scheduledFor ?? asset.scheduledFor,
      }).where(eq(gbpImageAssets.id, input.id));
      return { success: true, status: input.status };
    }),
});
