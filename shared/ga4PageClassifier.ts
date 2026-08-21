export type GA4PageType =
  | "species_pages"
  | "location_page"
  | "blog_pages"
  | "service_pages"
  | "other_pages";

const SPECIES_TERMS = [
  "bat", "bird", "chipmunk", "groundhog", "mice", "mouse", "opossum",
  "pigeon", "raccoon", "rat", "skunk", "squirrel", "vole", "wildlife",
];

function hasSpeciesTerm(path: string): boolean {
  const tokens = path.split(/[^a-z0-9]+/).filter(Boolean);
  return SPECIES_TERMS.some(term => tokens.includes(term));
}

export function normalizeGA4PagePath(pagePath: string): string {
  const raw = pagePath.trim();
  if (!raw) return "/";
  try {
    const parsed = new URL(raw, "https://www.skedaddlewildlife.com");
    return parsed.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  } catch {
    return raw.split(/[?#]/, 1)[0].replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  }
}

export function classifyGA4PagePath(pagePath: string): GA4PageType {
  const normalized = normalizeGA4PagePath(pagePath).toLowerCase();
  if (normalized === "/") return "other_pages";
  if (normalized.startsWith("/blog")) return "blog_pages";
  if (normalized.startsWith("/location/")) {
    const segments = normalized.split("/").filter(Boolean);
    if (segments.length === 2) return "location_page";
    if (hasSpeciesTerm(normalized)) return "species_pages";
    return "location_page";
  }
  if (hasSpeciesTerm(normalized)) return "species_pages";
  if (/\/(services?|residential|commercial)(\/|$)/.test(normalized)) return "service_pages";
  return "other_pages";
}

export function suburbSlugMatchesPage(pagePath: string, suburbName: string): boolean {
  const suburbSlug = suburbName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!suburbSlug) return false;
  const segments = normalizeGA4PagePath(pagePath).toLowerCase().split("/").filter(Boolean);
  return segments.includes(suburbSlug);
}

/**
 * A measured URL confirms a dedicated suburb hub only when it is a location
 * page, contains no species token, and ends at the suburb slug. A blog post or
 * species-by-suburb page can mention the same slug without proving the hub exists.
 */
export function dedicatedSuburbHubMatchesPage(pagePath: string, suburbName: string): boolean {
  const suburbSlug = suburbName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!suburbSlug) return false;
  const normalized = normalizeGA4PagePath(pagePath).toLowerCase();
  const segments = normalized.split("/").filter(Boolean);
  return classifyGA4PagePath(normalized) === "location_page"
    && !hasSpeciesTerm(normalized)
    && segments.at(-1) === suburbSlug;
}
