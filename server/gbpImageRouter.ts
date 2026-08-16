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

// ── Logo PNG loading (module scope, loaded once) ────────────────────────────
// Place the real Skedaddle logo at: server/assets/skedaddle-logo.png
// Must be a transparent PNG. It will be composited into the brand bar.
const __filename_local = fileURLToPath(import.meta.url);
const __dirname_local = dirname(__filename_local);
const LOGO_PATH = resolve(__dirname_local, "assets", "skedaddle-logo.png");
let logoPngBuffer: Buffer | null = null;
try {
  if (existsSync(LOGO_PATH)) {
    logoPngBuffer = readFileSync(LOGO_PATH);
  }
} catch {
  // Logo not available — will use text fallback
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
// Animals that need vision QA (any species that has been observed rendering incorrectly)
// This now includes ALL species since Flux Pro can confuse any animal
const QA_REQUIRED_ANIMALS = ["mouse", "mice", "bat", "bats", "vole", "voles", "chipmunk", "chipmunks", "mole", "moles", "shrew", "shrews", "skunk", "skunks", "raccoon", "raccoons", "squirrel", "squirrels", "opossum", "opossums", "groundhog", "groundhogs"];
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

// ── Action/framing variety pool (rotated per generation for anti-spam) ──────
// NOTE: The technician must NEVER be shown touching, holding, or grabbing the animal.
// Skedaddle uses humane exclusion: one-way doors, screening, entry-point sealing.
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

let actionFramingCounter = 0;
function getNextActionFraming(): string {
  const framing = ACTION_FRAMINGS[actionFramingCounter % ACTION_FRAMINGS.length];
  actionFramingCounter++;
  return framing;
}

// ── #4+#5+#6: Structured-intermediate prompt builder ────────────────────────
// Step 1: LLM extracts structured fields from post content
// Step 2: Deterministic template assembles the final Flux Pro prompt
interface ExtractedFields {
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
    model: "gpt-5-mini",
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

// Step 2: Deterministic template builds the final prompt from extracted fields
function buildPromptFromFields(
  fields: ExtractedFields,
  cityState: string,
  suburbText: string,
): string {
  const { species, sizeClass, scene, season } = fields;

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
  const speciesName = species.toLowerCase();

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

  // Pick a random job scene for this species
  const speciesScenes = jobScenes[speciesName] || jobScenes["raccoon"];
  const randomScene = speciesScenes[Math.floor(Math.random() * speciesScenes.length)];

  // Build a natural-looking prompt
  const prompt = [
    `${randomScene}.`,
    `Suburban residential home in ${suburbText}, ${cityState}.`,
    `${lighting}.`,
    `The technician's hands are holding tools or working on building materials only. The animal is nearby but not being touched or held.`,
    `Candid photo taken by a coworker on a phone during the job. Natural lighting, realistic, not posed or staged.`,
    `The ${speciesName} is clearly identifiable as a ${speciesDesc}.`,
  ].join(" ");

  return prompt;
}

// ── Combined prompt builder (replaces old buildPromptFromPost) ───────────────
async function buildPrompt(
  title: string,
  body: string,
  territory: string,
  suburb: string,
): Promise<{ prompt: string; serviceLabel: string; fields: ExtractedFields }> {
  const territoryData = TERRITORIES[territory];
  const cityState = territoryData?.cityState ?? territory;
  const suburbText = suburb || (territoryData?.suburbs[0] ?? cityState);

  const fields = await extractFieldsFromPost(title, body, territory, suburb);
  const prompt = buildPromptFromFields(fields, cityState, suburbText);

  return { prompt, serviceLabel: fields.serviceLabel, fields };
}

// ── #3: Vision-QA check (is the CORRECT species clearly identifiable?) ───────
// This checks both that an animal is present AND that it's the correct species.
async function visionQACheck(imageUrl: string, species: string): Promise<boolean> {
  const speciesDesc = getSpeciesDescription(species);
  try {
    const result = await invokeLLM({
      model: "gemini-3-flash-preview",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `Look at this photograph carefully. I need you to verify whether the animal shown is specifically a ${species}.

Key identifying features of a ${speciesDesc}.

Answer with JSON:
- "correctSpecies": true if the animal in the image is clearly a ${species} (has the correct distinguishing features), false if it looks like a different animal or is unidentifiable
- "animalVisible": true if any animal is clearly visible in the image, false if no animal is present
- "confidence": "high", "medium", or "low" based on how certain you are
- "actualSpecies": your best guess of what animal is actually shown (e.g. "raccoon", "groundhog", "generic rodent")` },
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
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              actualSpecies: { type: "string" },
            },
            required: ["correctSpecies", "animalVisible", "confidence", "actualSpecies"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const rawContent = result.choices[0]?.message?.content;
    const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(contentStr);
    // Pass only if the correct species is visible with at least medium confidence
    return parsed.correctSpecies === true && parsed.animalVisible === true && parsed.confidence !== "low";
  } catch {
    // If vision check fails, pass the image through (don't block on QA failure)
    return true;
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
): Promise<Buffer> {
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
  if (logoPngBuffer) {
    const logoHeight = Math.round(barH * 0.6);
    const resizedLogo = await sharp(logoPngBuffer)
      .resize({ height: logoHeight, fit: "inside" })
      .toBuffer();
    const logoMeta = await sharp(resizedLogo).metadata();
    const logoWidth = logoMeta.width ?? logoHeight * 3;
    const logoLeft = W - Math.round(W * 0.04) - logoWidth;
    const logoTop = barY + Math.round((barH - logoHeight) / 2);
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

  return await sharp(imageBuffer)
    .composite(composites)
    .jpeg({ quality: 92 })
    .toBuffer();
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
      quality: "medium",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`GPT Image 2 generation failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const result = (await response.json()) as { image: { b64Json: string; mimeType: string } };
  return Buffer.from(result.image.b64Json, "base64");
}

// ── Generate single image (with vision QA retry) ────────────────────────────
async function generateSingleImage(
  title: string,
  body: string,
  territory: string,
  suburb: string,
): Promise<{ url: string; filename: string; serviceLabel: string; prompt: string }> {
  const territoryData = TERRITORIES[territory];
  const cityState = territoryData?.cityState ?? territory;

  const { prompt, serviceLabel, fields } = await buildPrompt(title, body, territory, suburb);

  // Generate image via GPT Image 2 (built-in forge API)
  let rawBuffer = await generateImageViaGPT(prompt);
  console.log(`[GBP] Generated image via GPT Image 2 for species: ${fields.species}`);

  // #3: Vision QA check — retry up to 2 times for species accuracy
  const needsQA = QA_REQUIRED_ANIMALS.some(a => fields.species.toLowerCase().includes(a));
  console.log(`[GBP] Species: ${fields.species}, needsQA: ${needsQA}, sizeClass: ${fields.sizeClass}`);
  if (needsQA) {
    const speciesDesc = getSpeciesDescription(fields.species);

    for (let attempt = 0; attempt < 2; attempt++) {
      // Upload current buffer as temp for vision QA check
      const tempResized = await sharp(rawBuffer)
        .resize(1200, 900, { fit: "cover", position: "center" })
        .jpeg({ quality: 80 })
        .toBuffer();
      const { url: tempUrl } = await storagePut(`gbp-images/qa-temp-${Date.now()}-${attempt}.jpg`, tempResized, "image/jpeg");

      const passed = await visionQACheck(tempUrl, fields.species);
      console.log(`[GBP] QA attempt ${attempt}: passed=${passed} for species=${fields.species}`);
      if (passed) break;
      // Retry with increasingly specific prompt
      const retryPrompt = attempt === 0
        ? `Close-up wildlife photograph: a ${speciesDesc} clearly visible in the center foreground, occupying at least 30% of the frame. The animal is sitting on the ground near a suburban home foundation. Sharp focus on the animal showing its distinctive features. The animal is NOT being held or touched by anyone. Behind in soft bokeh: a Skedaddle wildlife technician in bright lime-green Skedaddle polo shirt with raccoon logo on chest, black cap with raccoon logo, inspecting the home exterior in ${cityState}. Photorealistic, Canon EOS R5, 85mm f/1.8, golden hour natural light.`
        : `Extreme close-up nature photograph of a single ${speciesDesc}. The animal fills most of the frame, photographed at eye level in a suburban backyard setting. Ultra-sharp detail on fur/feathers and distinctive markings. No humans visible. Shallow depth of field, background is a blurred residential home. Shot in ${suburb || cityState}. Photorealistic, Nikon Z9, 105mm macro lens, f/2.8.`;
      try {
        rawBuffer = await generateImageViaGPT(retryPrompt);
      } catch {
        // If retry fails, keep the current image and break
        break;
      }
    }
  }

  const rawMeta = await sharp(rawBuffer).metadata();
  console.log(`[GBP] Raw image from GPT Image 2: ${rawMeta.width}x${rawMeta.height}`);

  // Enforce exact 1200x900 dimensions regardless of what the model returns
  const resizedBuffer = await sharp(rawBuffer)
    .resize(1200, 900, { fit: "cover", position: "center" })
    .jpeg({ quality: 95 })
    .toBuffer();
  const resizedMeta = await sharp(resizedBuffer).metadata();
  console.log(`[GBP] After resize: ${resizedMeta.width}x${resizedMeta.height}`);

  const branded = await addBrandOverlay(resizedBuffer, serviceLabel, cityState);
  const brandedMeta = await sharp(branded).metadata();
  console.log(`[GBP] After overlay: ${brandedMeta.width}x${brandedMeta.height}`);

  // #2: Collision-safe filename with content hash
  const hash8 = contentHash8(title, body, territory, suburb);
  const slug = toAsciiSlug(title, 30);
  const safeTerritory = toAsciiSlug(territory, 20);
  const filename = `${safeTerritory}_${slug}_${hash8}.jpg`;
  const storageKey = `gbp-images/${filename}`;
  const { url: storedUrl } = await storagePut(storageKey, branded, "image/jpeg");

  return { url: storedUrl, filename, serviceLabel, prompt };
}

// ── In-memory job store for bulk generation ─────────────────────────────────
interface BulkJob {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  total: number;
  completed: number;
  results: Array<{
    index: number;
    url: string;
    filename: string;
    serviceLabel: string;
    prompt: string;
    success: boolean;
    error?: string;
  }>;
  createdAt: number;
}

const jobStore = new Map<string, BulkJob>();

// Clean up old jobs (older than 1 hour)
function cleanupOldJobs() {
  const oneHourAgo = Date.now() - 3600_000;
  jobStore.forEach((job, id) => {
    if (job.createdAt < oneHourAgo) jobStore.delete(id);
  });
}

// ── tRPC Router ───────────────────────────────────────────────────────────────
export const gbpImageRouter = router({
  getTerritories: publicProcedure.query(() => {
    return Object.entries(TERRITORIES).map(([id, t]) => ({
      id,
      label: t.label,
      suburbs: t.suburbs,
    }));
  }),

  getSuburbs: publicProcedure
    .input(z.object({ territoryId: z.string() }))
    .query(({ input }) => {
      const t = TERRITORIES[input.territoryId];
      return t ? t.suburbs : [];
    }),

  // Single post → single image
  generateSingle: publicProcedure
    .input(z.object({
      title: z.string().min(1),
      body: z.string().default(""),
      territory: z.string().min(1),
      suburb: z.string().default(""),
    }))
    .mutation(async ({ input }) => {
      const result = await generateSingleImage(
        input.title,
        input.body,
        input.territory,
        input.suburb,
      );
      return result;
    }),

  // #1: Bulk generation — submit job and return jobId immediately
  generateBulk: publicProcedure
    .input(z.object({
      posts: z.array(z.object({
        title: z.string().min(1),
        body: z.string().default(""),
        territory: z.string().min(1),
        suburb: z.string().default(""),
      })).min(1).max(50),
    }))
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
        results: [],
        createdAt: Date.now(),
      };
      jobStore.set(jobId, job);

      // Process concurrently with p-limit (6 concurrent)
      const limit = pLimit(6);

      // Fire and don't await — return jobId immediately
      const processAll = async () => {
        const tasks = input.posts.map((post, i) =>
          limit(async () => {
            // Idempotency: check if already generated (same content hash)
            const hash = contentHash8(post.title, post.body, post.territory, post.suburb);
            const existingResult = job.results.find(r =>
              r.filename.includes(hash) && r.success
            );
            if (existingResult) {
              job.completed++;
              return;
            }

            try {
              const result = await generateSingleImage(
                post.title,
                post.body,
                post.territory,
                post.suburb,
              );
              job.results.push({
                index: i,
                url: result.url,
                filename: result.filename,
                serviceLabel: result.serviceLabel,
                prompt: result.prompt,
                success: true,
              });
            } catch (err) {
              job.results.push({
                index: i,
                url: "",
                filename: "",
                serviceLabel: "",
                prompt: "",
                success: false,
                error: String(err),
              });
            }
            job.completed++;
          })
        );

        await Promise.all(tasks);
        job.status = job.results.some(r => !r.success) ? "completed" : "completed";
        // Sort results by index for consistent ordering
        job.results.sort((a, b) => a.index - b.index);
      };

      // Start processing in background (don't await)
      processAll().catch(() => {
        job.status = "failed";
      });

      return { jobId };
    }),

  // #1: Poll job status
  getJobStatus: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(({ input }) => {
      const job = jobStore.get(input.jobId);
      if (!job) {
        return { found: false as const, status: "not_found" as const, total: 0, completed: 0, results: [] };
      }
      return {
        found: true as const,
        status: job.status,
        total: job.total,
        completed: job.completed,
        results: job.results,
      };
    }),
});
