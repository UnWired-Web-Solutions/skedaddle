/**
 * Review-only JSON-LD builder. Every emitted fact must also be visible in the
 * reviewed draft. This builder intentionally omits ratings, reviews, hours,
 * prices, availability, physical addresses, service radii, parent-company
 * claims, and operational methods unless those facts are explicitly supported
 * by a future, visible-fact contract.
 */

export interface SuburbSchemaParams {
  territoryName: string;
  territorySlug: string;
  franchisePhone: string;
  suburbName: string;
  suburbSlug: string;
  species: Array<{ name: string; serviceType: string; slug: string; description: string }>;
  faqs: Array<{ question: string; answer: string }>;
  gbpUrl: string;
  visibleBusinessDescription: string;
  reviewerConfirmedServiceAvailability: true;
}

function requireText(value: string, label: string, maximum: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new Error(`Schema requires a valid ${label}.`);
  return normalized;
}

export function buildSuburbSchema(params: SuburbSchemaParams): object[] {
  if (params.reviewerConfirmedServiceAvailability !== true) {
    throw new Error("Schema requires reviewer-confirmed service availability.");
  }
  const territoryName = requireText(params.territoryName, "territory name", 160);
  const territorySlug = requireText(params.territorySlug, "territory slug", 100);
  const suburbName = requireText(params.suburbName, "suburb name", 160);
  const suburbSlug = requireText(params.suburbSlug, "suburb slug", 100);
  const phone = requireText(params.franchisePhone, "phone", 40);
  const description = requireText(params.visibleBusinessDescription, "visible business description", 1_500);
  const gbpUrl = requireText(params.gbpUrl, "reviewer-provided GBP URL", 2_000);
  const baseUrl = `https://www.skedaddlewildlife.com/location/${territorySlug}/${suburbSlug}/`;
  const localBusinessId = `${baseUrl}#localbusiness`;
  const name = territoryName;

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": localBusinessId,
    name,
    description,
    url: baseUrl,
    telephone: phone,
    sameAs: [gbpUrl],
    areaServed: { "@type": "City", name: suburbName },
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.skedaddlewildlife.com/" },
      { "@type": "ListItem", position: 2, name: "Locations", item: "https://www.skedaddlewildlife.com/location/" },
      { "@type": "ListItem", position: 3, name: territoryName, item: `https://www.skedaddlewildlife.com/location/${territorySlug}/` },
      { "@type": "ListItem", position: 4, name: suburbName, item: baseUrl },
    ],
  };

  const serviceBlocks = params.species.slice(0, 6).map((species) => {
    const speciesName = requireText(species.name, "species name", 100);
    return {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${baseUrl}#service-${requireText(species.slug, "species slug", 100)}`,
      name: `${speciesName} information for ${suburbName}`,
      serviceType: requireText(species.serviceType, "service type", 160),
      description: requireText(species.description, "visible species description", 1_500),
      provider: { "@id": localBusinessId },
      areaServed: { "@type": "City", name: suburbName },
    };
  });

  const faqPage = params.faqs.length ? [{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${baseUrl}#faq`,
    mainEntity: params.faqs.map((faq) => ({
      "@type": "Question",
      name: requireText(faq.question, "visible FAQ question", 220),
      acceptedAnswer: { "@type": "Answer", text: requireText(faq.answer, "visible FAQ answer", 1_500) },
    })),
  }] : [];

  return [localBusiness, breadcrumbs, ...serviceBlocks, ...faqPage];
}
