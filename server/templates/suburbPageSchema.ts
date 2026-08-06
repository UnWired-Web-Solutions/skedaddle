/**
 * Suburb Page JSON-LD Schema Template
 * Based on the validated Prior Lake (Minneapolis) pattern from Dave's Perplexity session.
 * 8 blocks: LocalBusiness, BreadcrumbList, 4x Service, FAQPage, HowTo
 *
 * All parameters are injected from territory + suburb data — no AI touches schema.
 */

export interface SuburbSchemaParams {
  // Territory info
  territoryName: string; // e.g. "Minneapolis"
  territorySlug: string; // e.g. "minneapolis"
  franchisePhone: string; // e.g. "(952) 460-2680"
  franchiseFoundedYear: string; // e.g. "2023"
  parentOrgFoundedYear: string; // always "1989"

  // Suburb info
  suburbName: string; // e.g. "Prior Lake"
  suburbSlug: string; // e.g. "prior-lake"
  latitude: number;
  longitude: number;
  county: string; // e.g. "Scott County, MN"
  state: string; // e.g. "MN"
  country: "US" | "CA";

  // Species (top 4 for Service blocks)
  species: Array<{
    name: string; // e.g. "Squirrel"
    serviceType: string; // e.g. "Squirrel removal"
    slug: string; // e.g. "squirrel"
    description: string; // Service-specific description
  }>;

  // Neighbourhoods within the suburb
  neighbourhoods: string[];

  // Nearby cities served (for areaServed)
  nearbyCities: string[];

  // GBP hours
  hours: {
    weekday: { opens: string; closes: string };
    saturday: { opens: string; closes: string };
    sunday: { opens: string; closes: string };
  };

  // FAQs (generated separately, passed in)
  faqs: Array<{ question: string; answer: string }>;

  // Social/citation links
  gbpUrl: string;
  bbbUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
}

export function buildSuburbSchema(params: SuburbSchemaParams): object[] {
  const baseUrl = `https://www.skedaddlewildlife.com/location/${params.territorySlug}/${params.suburbSlug}/`;
  const localBusinessId = `${baseUrl}#localbusiness`;

  const sameAs: string[] = [params.gbpUrl];
  if (params.bbbUrl) sameAs.push(params.bbbUrl);
  if (params.facebookUrl) sameAs.push(params.facebookUrl);
  if (params.instagramUrl) sameAs.push(params.instagramUrl);
  if (params.linkedinUrl) sameAs.push(params.linkedinUrl);
  if (params.youtubeUrl) sameAs.push(params.youtubeUrl);

  // Block 1: LocalBusiness (Service-Area Business)
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": localBusinessId,
    "name": `Skedaddle Humane Wildlife Control - ${params.territoryName}`,
    "alternateName": `Skedaddle ${params.territoryName}`,
    "description": `Skedaddle ${params.territoryName} provides humane wildlife removal and prevention-focused exclusion services to ${params.suburbName}, ${params.state} property owners, resolving problems involving ${params.species.map(s => s.name.toLowerCase() + "s").join(", ")} using one-way-door exclusion instead of traps or poison.`,
    "url": baseUrl,
    "telephone": params.franchisePhone,
    "priceRange": "$$",
    "image": `https://www.skedaddlewildlife.com/wp-content/uploads/og-${params.territorySlug}-${params.suburbSlug}.jpg`,
    "logo": "https://www.skedaddlewildlife.com/wp-content/uploads/2021/02/skedaddle-logo.png",
    "foundingDate": params.franchiseFoundedYear,
    "parentOrganization": {
      "@type": "Organization",
      "name": "Skedaddle Humane Wildlife Control",
      "url": "https://www.skedaddlewildlife.com/",
      "foundingDate": params.parentOrgFoundedYear,
      "founder": { "@type": "Person", "name": "Bill Dowd" },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "1288 Osprey Dr",
        "addressLocality": "Ancaster",
        "addressRegion": "ON",
        "postalCode": "L9G 4V5",
        "addressCountry": "CA",
      },
    },
    "hasMap": `https://www.google.com/maps/search/?api=1&query=Skedaddle+${params.territoryName}`,
    "sameAs": sameAs,
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": params.hours.weekday.opens,
        "closes": params.hours.weekday.closes,
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Saturday",
        "opens": params.hours.saturday.opens,
        "closes": params.hours.saturday.closes,
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Sunday",
        "opens": params.hours.sunday.opens,
        "closes": params.hours.sunday.closes,
      },
    ],
    "serviceArea": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": params.latitude,
        "longitude": params.longitude,
      },
      "geoRadius": "25000",
    },
    "areaServed": [
      { "@type": "City", "name": params.suburbName },
      ...params.neighbourhoods.map(n => ({ "@type": "Place" as const, "name": `${n}, ${params.suburbName}` })),
      { "@type": "AdministrativeArea", "name": params.county },
      ...params.nearbyCities.map(c => ({ "@type": "City" as const, "name": c })),
    ],
    "serviceType": ["Wildlife removal", "Humane wildlife control", "Pest exclusion", "Attic restoration"],
    "knowsAbout": params.species.map(s => `${s.name} removal`),
  };

  // Block 2: BreadcrumbList
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.skedaddlewildlife.com/" },
      { "@type": "ListItem", "position": 2, "name": "Locations", "item": "https://www.skedaddlewildlife.com/location/" },
      { "@type": "ListItem", "position": 3, "name": params.territoryName, "item": `https://www.skedaddlewildlife.com/location/${params.territorySlug}/` },
      { "@type": "ListItem", "position": 4, "name": params.suburbName, "item": baseUrl },
    ],
  };

  // Block 3: Service blocks (one per top species)
  const serviceBlocks = params.species.slice(0, 4).map(sp => ({
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${baseUrl}#service-${sp.slug}`,
    "serviceType": sp.serviceType,
    "name": `${sp.serviceType} in ${params.suburbName}`,
    "description": sp.description,
    "provider": { "@id": localBusinessId },
    "areaServed": { "@type": "City", "name": params.suburbName },
    "audience": { "@type": "Audience", "audienceType": "Homeowners" },
    "offers": {
      "@type": "Offer",
      "priceCurrency": params.country === "US" ? "USD" : "CAD",
      "priceSpecification": {
        "@type": "PriceSpecification",
        "priceCurrency": params.country === "US" ? "USD" : "CAD",
        "description": "Inspection and quote provided on-site; final price depends on scope and property",
      },
      "availability": "https://schema.org/InStock",
      "areaServed": { "@type": "City", "name": params.suburbName },
    },
  }));

  // Block 4: FAQPage
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${baseUrl}#faq`,
    "mainEntity": params.faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": { "@type": "Answer", "text": faq.answer },
    })),
  };

  // Block 5: HowTo (standard exclusion process)
  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": `How Skedaddle removes wildlife humanely in ${params.suburbName}`,
    "description": `The step-by-step process Skedaddle ${params.territoryName} follows to remove wildlife humanely from ${params.suburbName} homes, using one-way-door exclusion instead of traps or poison.`,
    "totalTime": "P1D",
    "supply": [
      { "@type": "HowToSupply", "name": "One-way exclusion door" },
      { "@type": "HowToSupply", "name": "Galvanized steel mesh" },
      { "@type": "HowToSupply", "name": "Weather-rated sealant and flashing" },
    ],
    "tool": [
      { "@type": "HowToTool", "name": "Inspection ladder and PPE" },
      { "@type": "HowToTool", "name": "Thermal or visual attic inspection equipment" },
    ],
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Inspection",
        "text": `A Skedaddle technician inspects the home in ${params.suburbName} to identify the animal species, all active and inactive entry points, and any signs of a maternity den, before recommending any work.`,
        "url": `${baseUrl}#step-inspection`,
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Humane exclusion",
        "text": "A one-way door is installed at the primary entry point so the animal can leave on its own but cannot get back in. During maternity seasons, young are reunited with the mother outside the entry point using a warm reunion box.",
        "url": `${baseUrl}#step-exclusion`,
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Confirmation and sealing",
        "text": "After the technician confirms the animal has left, every entry point is sealed with galvanized steel mesh and weather-rated materials built to hold up to wildlife pressure.",
        "url": `${baseUrl}#step-sealing`,
      },
      {
        "@type": "HowToStep",
        "position": 4,
        "name": "Cleanup and decontamination",
        "text": "Contaminated insulation, droppings, and nesting material are removed where applicable, and the affected area is decontaminated to eliminate scent trails that attract other wildlife.",
        "url": `${baseUrl}#step-cleanup`,
      },
      {
        "@type": "HowToStep",
        "position": 5,
        "name": "Warranty and follow-up",
        "text": "Every serviced entry point is backed by Skedaddle's lifetime guarantee against re-entry. If the same animal returns through a sealed entry point, Skedaddle re-seals it at no additional charge.",
        "url": `${baseUrl}#step-warranty`,
      },
    ],
  };

  return [localBusiness, breadcrumbs, ...serviceBlocks, faqPage, howTo];
}
