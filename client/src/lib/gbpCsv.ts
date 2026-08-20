export interface CsvTerritory {
  id: string;
  label: string;
}

export interface ParsedGbpPost {
  id: string;
  title: string;
  body: string;
  territory: string;
  suburb: string;
  scheduledFor: string;
}

export interface GbpCsvParseResult {
  posts: ParsedGbpPost[];
  errors: Array<{ row: number; message: string }>;
}

/** Small RFC 4180 parser that preserves commas, quotes, and newlines in cells. */
export function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    const next = input[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value.trim().length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (quoted) throw new Error("CSV contains an unclosed quoted field");
  row.push(cell.replace(/\r$/, ""));
  if (row.some((value) => value.trim().length > 0)) rows.push(row);
  return rows;
}

function normalize(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export function resolveTerritoryId(raw: string, territories: CsvTerritory[]): string | null {
  const wanted = normalize(raw);
  if (!wanted) return null;
  const exact = territories.find((territory) =>
    normalize(territory.id) === wanted || normalize(territory.label) === wanted,
  );
  if (exact) return exact.id;

  const prefixMatches = territories.filter((territory) =>
    normalize(territory.label.split(",")[0]) === wanted,
  );
  return prefixMatches.length === 1 ? prefixMatches[0].id : null;
}

export function parseGbpCsv(text: string, territories: CsvTerritory[]): GbpCsvParseResult {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return { posts: [], errors: [{ row: 1, message: "CSV must contain a header and at least one post" }] };
  }

  const headers = rows[0].map(normalize);
  const indexOf = (...names: string[]) => names.map(normalize).map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const titleIndex = indexOf("post_title", "title");
  const bodyIndex = indexOf("post_body", "body");
  const territoryIndex = indexOf("territory", "territory_id");
  const suburbIndex = indexOf("suburb", "location");
  const scheduledIndex = indexOf("scheduled_for", "scheduled_date");
  const errors: GbpCsvParseResult["errors"] = [];
  const posts: ParsedGbpPost[] = [];

  if (titleIndex < 0) errors.push({ row: 1, message: "Missing post_title column" });
  if (territoryIndex < 0) errors.push({ row: 1, message: "Missing territory column" });
  if (errors.length > 0) return { posts, errors };

  rows.slice(1).forEach((cells, offset) => {
    const rowNumber = offset + 2;
    const title = (cells[titleIndex] || "").trim();
    const territoryRaw = (cells[territoryIndex] || "").trim();
    const territory = resolveTerritoryId(territoryRaw, territories);
    const scheduledFor = scheduledIndex >= 0 ? (cells[scheduledIndex] || "").trim() : "";

    if (!title) errors.push({ row: rowNumber, message: "Post title is required" });
    if (!territory) errors.push({ row: rowNumber, message: `Unknown territory: ${territoryRaw || "(blank)"}` });
    if (scheduledFor && !isIsoCalendarDate(scheduledFor)) {
      errors.push({ row: rowNumber, message: "scheduled_for must be a real date using YYYY-MM-DD" });
    }
    if (!title || !territory || (scheduledFor && !isIsoCalendarDate(scheduledFor))) return;

    posts.push({
      id: `csv-${rowNumber}`,
      title,
      body: bodyIndex >= 0 ? (cells[bodyIndex] || "").trim() : "",
      territory,
      suburb: suburbIndex >= 0 ? (cells[suburbIndex] || "").trim() : "",
      scheduledFor,
    });
  });

  return { posts, errors };
}
