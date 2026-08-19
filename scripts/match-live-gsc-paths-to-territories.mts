import { readFile, writeFile } from "node:fs/promises";
import { TERRITORY_GROUPS } from "../shared/territoryMapping";

const pages = JSON.parse(
  await readFile("/home/ubuntu/gsc-live-location-paths-2026-07.json", "utf8"),
) as string[];

const roots = [...new Set(
  pages
    .map(path => path.match(/^\/location\/([^/]+)\//)?.[1])
    .filter((root): root is string => Boolean(root)),
)].sort();

const normalize = (value: string) => value
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/\//g, " ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .replace(/-(on|ca|md|ga|oh|pa|mn|co|us)$/g, "");

const candidates = TERRITORY_GROUPS.map(territory => {
  const mappedCities = territory.ga4Territories;
  const matches = roots.filter(root => {
    const normalizedRoot = normalize(root);
    return mappedCities.some(city => normalizedRoot === normalize(city));
  });

  return {
    territoryId: territory.id,
    territoryName: territory.name,
    mappedCities,
    exactLiveLocationRoots: matches,
    exactLiveLocationPaths: matches.map(root => `/location/${root}/`),
  };
});

await writeFile(
  "/home/ubuntu/gsc-live-territory-path-candidates-2026-07.json",
  `${JSON.stringify({ roots, candidates }, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({ rootCount: roots.length, output: "/home/ubuntu/gsc-live-territory-path-candidates-2026-07.json" }));
