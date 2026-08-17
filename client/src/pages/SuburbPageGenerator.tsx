import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Eye,
  ChevronDown,
  ChevronRight,
  Loader2,
  Copy,
  ExternalLink,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeneratedContent {
  urlSlug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  trustChips: string[];
  nap: { name: string; phone: string; serviceArea: string; source: string };
  introSection: string;
  whyChooseSection: string;
  speciesSections: Array<{
    species: string;
    tier: 1 | 2 | 3;
    heading: string;
    body: string;
    wordCount: number;
    internalLink: string;
  }>;
  neighbourhoodSection: string;
  faqSection: Array<{ question: string; answer: string }>;
  closingCta: string;
  schemaBlocks: object[];
  launchChecklist: Array<{ item: string; status: "ready" | "needs_review" | "pending" }>;
  citations: Array<{ fact: string; source: string; verified: boolean }>;
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    draft: { bg: "oklch(0.94 0.008 80)", color: "oklch(0.52 0.016 80)", label: "Draft" },
    in_review: { bg: "oklch(0.92 0.06 80)", color: "oklch(0.45 0.10 80)", label: "In Review" },
    approved: { bg: "oklch(0.92 0.06 145)", color: "oklch(0.28 0.09 145)", label: "Approved" },
    exported: { bg: "oklch(0.90 0.06 260)", color: "oklch(0.35 0.12 260)", label: "Exported" },
  };
  const s = styles[status] || styles.draft;
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-sm"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function ResearchProgressCard({ suburbName }: { suburbName: string }) {
  const researchSteps = [
    "Checking whether a dedicated Skedaddle page already exists",
    "Researching local neighbourhoods, county, and guidance",
    "Reviewing the local competitor landscape",
  ];

  return (
    <div
      className="rounded-sm border p-6"
      style={{ borderColor: "oklch(0.82 0.08 145)", background: "oklch(0.975 0.018 145)" }}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: "oklch(0.68 0.20 140)", color: "white" }}
        >
          <Loader2 size={16} className="animate-spin" />
        </div>
        <div>
          <h2 className="text-base font-semibold" style={{ color: "oklch(0.55 0.18 140)", fontFamily: "Inter, sans-serif" }}>
            Researching with Sonar…
          </h2>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "oklch(0.35 0.04 145)", fontFamily: "Inter, sans-serif" }}>
            Before Claude Opus 5 drafts the {suburbName} page, the system runs live web research and preserves the resulting source URLs for review.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3 border-t pt-4" style={{ borderColor: "oklch(0.84 0.06 145)" }}>
        {researchSteps.map((step, index) => (
          <div key={step} className="flex items-center gap-3 text-sm" style={{ color: "oklch(0.32 0.04 145)", fontFamily: "Inter, sans-serif" }}>
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{ background: "oklch(0.90 0.07 145)", color: "oklch(0.28 0.09 145)" }}
            >
              {index + 1}
            </span>
            <span>{step}</span>
          </div>
        ))}
        <div className="flex items-center gap-3 pt-1 text-sm" style={{ color: "oklch(0.45 0.04 145)", fontFamily: "Inter, sans-serif" }}>
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
            style={{ background: "oklch(0.94 0.04 145)", color: "oklch(0.38 0.07 145)" }}
          >
            4
          </span>
          <span>Drafting the source-labelled content package with Claude Opus 5</span>
        </div>
      </div>

      <p className="mt-5 text-xs leading-relaxed" style={{ color: "oklch(0.48 0.03 145)", fontFamily: "Inter, sans-serif" }}>
        Research findings are suggestions with citations, not automatically verified publishing facts. Review the citations before approval.
      </p>
    </div>
  );
}

// ─── Content Preview ─────────────────────────────────────────────────────────

function ContentPreview({ content }: { content: GeneratedContent }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["intro", "species", "schema"]));

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const SectionHeader = ({ id, title, badge }: { id: string; title: string; badge?: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-sm hover:bg-black/5 transition-colors"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {expandedSections.has(id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      <span className="font-semibold text-sm" style={{ color: "oklch(0.18 0.015 65)" }}>{title}</span>
      {badge && (
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.94 0.008 80)", color: "oklch(0.52 0.016 80)" }}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-1">
      {/* Meta */}
      <SectionHeader id="meta" title="Meta & URL" />
      {expandedSections.has("meta") && (
        <div className="pl-8 pb-3 space-y-2" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}>
          <div><span className="font-medium" style={{ color: "oklch(0.52 0.016 80)" }}>URL:</span> <code className="text-xs bg-black/5 px-1.5 py-0.5 rounded">{content.urlSlug}</code></div>
          <div><span className="font-medium" style={{ color: "oklch(0.52 0.016 80)" }}>Title:</span> {content.metaTitle}</div>
          <div><span className="font-medium" style={{ color: "oklch(0.52 0.016 80)" }}>Description:</span> {content.metaDescription} <span className="text-xs" style={{ color: content.metaDescription.length <= 155 ? "oklch(0.42 0.12 145)" : "oklch(0.55 0.20 27)" }}>({content.metaDescription.length} chars)</span></div>
          <div><span className="font-medium" style={{ color: "oklch(0.52 0.016 80)" }}>H1:</span> {content.h1}</div>
        </div>
      )}

      {/* Trust Chips */}
      <SectionHeader id="trust" title="Trust Chips" badge={`${content.trustChips.length} chips`} />
      {expandedSections.has("trust") && (
        <div className="pl-8 pb-3 flex flex-wrap gap-2">
          {content.trustChips.map((chip, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded-sm border" style={{ borderColor: "oklch(0.88 0.012 80)", color: "oklch(0.68 0.20 140)", fontFamily: "Inter, sans-serif" }}>
              {chip}
            </span>
          ))}
        </div>
      )}

      {/* Intro */}
      <SectionHeader id="intro" title="Introduction" badge="80-100 words" />
      {expandedSections.has("intro") && (
        <div className="pl-8 pb-3 text-sm leading-relaxed" style={{ color: "oklch(0.25 0.015 65)", fontFamily: "Inter, sans-serif" }}>
          {content.introSection}
        </div>
      )}

      {/* Why Choose */}
      <SectionHeader id="why" title="Why Homeowners Choose Skedaddle" badge="~150 words" />
      {expandedSections.has("why") && (
        <div className="pl-8 pb-3 text-sm leading-relaxed whitespace-pre-line" style={{ color: "oklch(0.25 0.015 65)", fontFamily: "Inter, sans-serif" }}>
          {content.whyChooseSection}
        </div>
      )}

      {/* Species Sections */}
      <SectionHeader id="species" title="Species Sections" badge={`${content.speciesSections.length} species`} />
      {expandedSections.has("species") && (
        <div className="pl-8 pb-3 space-y-4">
          {content.speciesSections.map((sp, i) => (
            <div key={i} className="border-l-2 pl-3" style={{ borderColor: sp.tier === 1 ? "oklch(0.68 0.20 140)" : sp.tier === 2 ? "oklch(0.65 0.10 80)" : "oklch(0.85 0.008 80)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold" style={{ color: "oklch(0.18 0.015 65)", fontFamily: "Inter, sans-serif" }}>{sp.heading}</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: sp.tier === 1 ? "oklch(0.92 0.06 145)" : "oklch(0.94 0.008 80)", color: sp.tier === 1 ? "oklch(0.28 0.09 145)" : "oklch(0.52 0.016 80)" }}>
                  Tier {sp.tier} · {sp.wordCount}w
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "oklch(0.35 0.015 65)", fontFamily: "Inter, sans-serif" }}>{sp.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Neighbourhood */}
      <SectionHeader id="neighbourhood" title="Neighbourhood / AEO Section" badge="direct answer" />
      {expandedSections.has("neighbourhood") && (
        <div className="pl-8 pb-3 text-sm leading-relaxed" style={{ color: "oklch(0.25 0.015 65)", fontFamily: "Inter, sans-serif" }}>
          {content.neighbourhoodSection}
        </div>
      )}

      {/* FAQs */}
      <SectionHeader id="faq" title="FAQs" badge={`${content.faqSection.length} questions`} />
      {expandedSections.has("faq") && (
        <div className="pl-8 pb-3 space-y-3">
          {content.faqSection.map((faq, i) => (
            <div key={i} style={{ fontFamily: "Inter, sans-serif" }}>
              <div className="text-sm font-medium" style={{ color: "oklch(0.18 0.015 65)" }}>Q: {faq.question}</div>
              <div className="text-sm mt-0.5" style={{ color: "oklch(0.45 0.015 65)" }}>A: {faq.answer}</div>
            </div>
          ))}
        </div>
      )}

      {/* Schema */}
      <SectionHeader id="schema" title="JSON-LD Schema" badge={`${content.schemaBlocks.length} blocks`} />
      {expandedSections.has("schema") && (
        <div className="pl-8 pb-3">
          <pre className="text-xs bg-black/5 p-3 rounded overflow-x-auto max-h-64" style={{ fontFamily: "monospace" }}>
            {JSON.stringify(content.schemaBlocks, null, 2).slice(0, 2000)}...
          </pre>
        </div>
      )}

      {/* Launch Checklist */}
      <SectionHeader id="checklist" title="Launch Checklist" badge={`${content.launchChecklist.filter(c => c.status === "ready").length}/${content.launchChecklist.length} ready`} />
      {expandedSections.has("checklist") && (
        <div className="pl-8 pb-3 space-y-1">
          {content.launchChecklist.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
              {item.status === "ready" ? <CheckCircle2 size={14} style={{ color: "oklch(0.42 0.12 145)" }} /> :
               item.status === "needs_review" ? <AlertCircle size={14} style={{ color: "oklch(0.55 0.15 80)" }} /> :
               <Clock size={14} style={{ color: "oklch(0.65 0.010 80)" }} />}
              <span style={{ color: "oklch(0.35 0.015 65)" }}>{item.item}</span>
            </div>
          ))}
        </div>
      )}

      {/* Citations */}
      <SectionHeader id="citations" title="Source Citations" badge={`${content.citations.filter(c => c.verified).length}/${content.citations.length} verified`} />
      {expandedSections.has("citations") && (
        <div className="pl-8 pb-3 space-y-1">
          {content.citations.map((cite, i) => (
            <div key={i} className="flex items-start gap-2 text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
              {cite.verified ? <CheckCircle2 size={12} className="mt-0.5 shrink-0" style={{ color: "oklch(0.42 0.12 145)" }} /> :
               <AlertCircle size={12} className="mt-0.5 shrink-0" style={{ color: "oklch(0.55 0.20 27)" }} />}
              <div>
                <span style={{ color: "oklch(0.25 0.015 65)" }}>{cite.fact}</span>
                <span className="ml-2" style={{ color: cite.verified ? "oklch(0.52 0.016 80)" : "oklch(0.55 0.20 27)" }}>— {cite.source}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SuburbPageGenerator() {
  const { user } = useAuth();
  const [selectedTerritory, setSelectedTerritory] = useState<string>("");
  const [selectedSuburb, setSelectedSuburb] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [yearsServing, setYearsServing] = useState("");
  const [neighbourhoods, setNeighbourhoods] = useState("");
  const [county, setCounty] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [franchiseFoundedYear, setFranchiseFoundedYear] = useState("");
  const [gbpUrl, setGbpUrl] = useState("");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generatedPageId, setGeneratedPageId] = useState<number | null>(null);
  const [generatedStatus, setGeneratedStatus] = useState<string>("draft");
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");

  const territoriesQuery = trpc.suburbPage.getTerritories.useQuery();
  const listQuery = trpc.suburbPage.list.useQuery(undefined);
  const generateMutation = trpc.suburbPage.generate.useMutation();
  const updateStatusMutation = trpc.suburbPage.updateStatus.useMutation();
  const utils = trpc.useUtils();

  const territories = territoriesQuery.data || [];
  const selectedTerritoryData = territories.find(t => t.id === selectedTerritory);
  const suburbs = selectedTerritoryData?.suburbs || [];

  const handleGenerate = async () => {
    if (!selectedTerritory || !selectedSuburb || !phone || !yearsServing || !neighbourhoods || !county || !latitude || !longitude || !franchiseFoundedYear || !gbpUrl) return;

    const result = await generateMutation.mutateAsync({
      territoryId: selectedTerritory,
      suburbName: selectedSuburb,
      phone,
      yearsServing,
      franchiseFoundedYear,
      gbpUrl,
      neighbourhoods: neighbourhoods.split(",").map(n => n.trim()).filter(Boolean),
      county,
      latitude: Number(latitude),
      longitude: Number(longitude),
    });

    setGeneratedContent(result.content as unknown as GeneratedContent);
    setGeneratedPageId(Number(result.id));
    setGeneratedStatus("draft");
    listQuery.refetch();
  };

  const handleExportMarkdown = async (content: GeneratedContent) => {
    if (!generatedPageId || generatedStatus !== "approved") return;
    let md = `# ${content.h1}\n\n`;
    md += `**URL:** ${content.urlSlug}\n`;
    md += `**Meta Title:** ${content.metaTitle}\n`;
    md += `**Meta Description:** ${content.metaDescription}\n\n`;
    md += `---\n\n`;
    md += `## Trust Chips\n${content.trustChips.map(c => `- ${c}`).join("\n")}\n\n`;
    md += `## Introduction\n${content.introSection}\n\n`;
    md += `## Why Homeowners Choose Skedaddle\n${content.whyChooseSection}\n\n`;
    md += `## Wildlife We Remove\n\n`;
    content.speciesSections.forEach(sp => {
      md += `### ${sp.heading}\n${sp.body}\n\n*Internal link: ${sp.internalLink}*\n\n`;
    });
    md += `## Service Area\n${content.neighbourhoodSection}\n\n`;
    md += `## Frequently Asked Questions\n\n`;
    content.faqSection.forEach(faq => {
      md += `**Q: ${faq.question}**\nA: ${faq.answer}\n\n`;
    });
    md += `## CTA\n${content.closingCta}\n\n`;
    md += `---\n\n## JSON-LD Schema\n\n\`\`\`json\n${JSON.stringify(content.schemaBlocks, null, 2)}\n\`\`\`\n`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${content.urlSlug.replace(/\//g, "_").replace(/^_|_$/g, "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    await updateStatusMutation.mutateAsync({ id: generatedPageId, status: "exported" });
    setGeneratedStatus("exported");
    listQuery.refetch();
  };

  const handleOpenHistory = async (id: number, status: string) => {
    const page = await utils.suburbPage.getPage.fetch({ id });
    setGeneratedContent(page.content as unknown as GeneratedContent);
    setGeneratedPageId(id);
    setGeneratedStatus(status);
    setActiveTab("generate");
  };

  const handleCopySchema = (content: GeneratedContent) => {
    navigator.clipboard.writeText(JSON.stringify(content.schemaBlocks, null, 2));
  };

  return (
    <PortalLayout>
      <div className="px-6 py-8 max-w-6xl">
        {/* Page header */}
        <div className="mb-6">
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "oklch(0.75 0.18 140)", fontFamily: "Inter, sans-serif" }}
          >
            Content Generation
          </div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}
          >
            Suburb Page Generator
          </h1>
          <p className="text-sm" style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
            Generate review-ready suburb page content with territory-priority species, JSON-LD schema, and clearly separated verified facts and research suggestions.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b" style={{ borderColor: "oklch(0.88 0.012 80)" }}>
          <button
            onClick={() => setActiveTab("generate")}
            className="pb-2 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: activeTab === "generate" ? "oklch(0.68 0.20 140)" : "transparent",
              color: activeTab === "generate" ? "oklch(0.68 0.20 140)" : "oklch(0.52 0.016 80)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Generate New
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className="pb-2 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: activeTab === "history" ? "oklch(0.68 0.20 140)" : "transparent",
              color: activeTab === "history" ? "oklch(0.68 0.20 140)" : "oklch(0.52 0.016 80)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Generated Pages ({listQuery.data?.length || 0})
          </button>
        </div>

        {activeTab === "generate" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Input form */}
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-sm border p-4" style={{ borderColor: "oklch(0.88 0.012 80)", background: "oklch(1 0 0)" }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "oklch(0.18 0.015 65)", fontFamily: "Inter, sans-serif" }}>Configuration</h3>

                {/* Territory select */}
                <label className="block mb-3">
                  <span className="text-xs font-medium" style={{ color: "oklch(0.52 0.016 80)" }}>Territory</span>
                  <select
                    value={selectedTerritory}
                    onChange={e => { setSelectedTerritory(e.target.value); setSelectedSuburb(""); }}
                    className="mt-1 block w-full text-sm border rounded-sm px-3 py-2"
                    style={{ borderColor: "oklch(0.88 0.012 80)" }}
                  >
                    <option value="">Select territory...</option>
                    {territories.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.state})</option>
                    ))}
                  </select>
                </label>

                {/* Suburb select */}
                <label className="block mb-3">
                  <span className="text-xs font-medium" style={{ color: "oklch(0.52 0.016 80)" }}>Suburb</span>
                  <select
                    value={selectedSuburb}
                    onChange={e => setSelectedSuburb(e.target.value)}
                    className="mt-1 block w-full text-sm border rounded-sm px-3 py-2"
                    style={{ borderColor: "oklch(0.88 0.012 80)" }}
                    disabled={!selectedTerritory}
                  >
                    <option value="">Select suburb...</option>
                    {suburbs.map(s => (
                      <option key={s.name} value={s.name}>{s.name} (${(s.revenue / 1000).toFixed(0)}K · {s.jobs} jobs)</option>
                    ))}
                  </select>
                </label>

                {/* Required business facts */}
                <div className="border-t pt-3 mt-3" style={{ borderColor: "oklch(0.93 0.008 80)" }}>
                  <span className="text-xs font-medium" style={{ color: "oklch(0.52 0.016 80)" }}>Required publishing facts</span>
                  <p className="text-xs mt-1" style={{ color: "oklch(0.65 0.010 80)" }}>No placeholder phone, coordinates, county, or neighbourhoods will be inserted.</p>

                  <label className="block mt-2">
                    <span className="text-xs" style={{ color: "oklch(0.65 0.010 80)" }}>Phone (from GBP)</span>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="(952) 460-2680"
                      className="mt-0.5 block w-full text-sm border rounded-sm px-3 py-1.5"
                      style={{ borderColor: "oklch(0.88 0.012 80)" }}
                    />
                  </label>

                  <label className="block mt-2">
                    <span className="text-xs" style={{ color: "oklch(0.65 0.010 80)" }}>Google Business Profile URL</span>
                    <input
                      type="url"
                      value={gbpUrl}
                      onChange={e => setGbpUrl(e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className="mt-0.5 block w-full text-sm border rounded-sm px-3 py-1.5"
                      style={{ borderColor: "oklch(0.88 0.012 80)" }}
                    />
                  </label>

                  <label className="block mt-2">
                    <span className="text-xs" style={{ color: "oklch(0.65 0.010 80)" }}>Franchise founded year</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={franchiseFoundedYear}
                      onChange={e => setFranchiseFoundedYear(e.target.value)}
                      placeholder="2023"
                      className="mt-0.5 block w-full text-sm border rounded-sm px-3 py-1.5"
                      style={{ borderColor: "oklch(0.88 0.012 80)" }}
                    />
                  </label>

                  <label className="block mt-2">
                    <span className="text-xs" style={{ color: "oklch(0.65 0.010 80)" }}>Year franchise started serving area</span>
                    <input
                      type="text"
                      value={yearsServing}
                      onChange={e => setYearsServing(e.target.value)}
                      placeholder="1993"
                      className="mt-0.5 block w-full text-sm border rounded-sm px-3 py-1.5"
                      style={{ borderColor: "oklch(0.88 0.012 80)" }}
                    />
                  </label>

                  <label className="block mt-2">
                    <span className="text-xs" style={{ color: "oklch(0.65 0.010 80)" }}>Neighbourhoods (comma-separated)</span>
                    <input
                      type="text"
                      value={neighbourhoods}
                      onChange={e => setNeighbourhoods(e.target.value)}
                      placeholder="Lower Prior Lake, Upper Prior Lake, The Wilds"
                      className="mt-0.5 block w-full text-sm border rounded-sm px-3 py-1.5"
                      style={{ borderColor: "oklch(0.88 0.012 80)" }}
                    />
                  </label>

                  <label className="block mt-2">
                    <span className="text-xs" style={{ color: "oklch(0.65 0.010 80)" }}>County / regional municipality</span>
                    <input
                      type="text"
                      value={county}
                      onChange={e => setCounty(e.target.value)}
                      placeholder="Scott County, MN"
                      className="mt-0.5 block w-full text-sm border rounded-sm px-3 py-1.5"
                      style={{ borderColor: "oklch(0.88 0.012 80)" }}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <label>
                      <span className="text-xs" style={{ color: "oklch(0.65 0.010 80)" }}>Latitude</span>
                      <input type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="44.7133" className="mt-0.5 block w-full text-sm border rounded-sm px-3 py-1.5" style={{ borderColor: "oklch(0.88 0.012 80)" }} />
                    </label>
                    <label>
                      <span className="text-xs" style={{ color: "oklch(0.65 0.010 80)" }}>Longitude</span>
                      <input type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="-93.4227" className="mt-0.5 block w-full text-sm border rounded-sm px-3 py-1.5" style={{ borderColor: "oklch(0.88 0.012 80)" }} />
                    </label>
                  </div>
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={!selectedTerritory || !selectedSuburb || !phone || !gbpUrl || !yearsServing || !franchiseFoundedYear || !neighbourhoods || !county || !latitude || !longitude || generateMutation.isPending}
                  className="mt-4 w-full py-2.5 rounded-sm text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                  style={{ background: "oklch(0.68 0.20 140)", fontFamily: "Inter, sans-serif" }}
                >
                  {generateMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Researching with Sonar…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <FileText size={14} />
                      Generate Suburb Page
                    </span>
                  )}
                </button>

                {generateMutation.isError && (
                  <div className="mt-2 text-xs p-2 rounded-sm" style={{ background: "oklch(0.95 0.05 27)", color: "oklch(0.45 0.15 27)" }}>
                    Error: {generateMutation.error?.message}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Preview */}
            <div className="lg:col-span-2">
              {generateMutation.isPending ? (
                <ResearchProgressCard suburbName={selectedSuburb} />
              ) : generatedContent ? (
                <div className="rounded-sm border" style={{ borderColor: "oklch(0.88 0.012 80)", background: "oklch(1 0 0)" }}>
                  {/* Preview header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "oklch(0.93 0.008 80)" }}>
                    <div className="flex items-center gap-2">
                      <Eye size={14} style={{ color: "oklch(0.68 0.20 140)" }} />
                      <span className="text-sm font-semibold" style={{ color: "oklch(0.18 0.015 65)", fontFamily: "Inter, sans-serif" }}>
                        Preview: {generatedContent.h1}
                      </span>
                      <StatusBadge status={generatedStatus} />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopySchema(generatedContent)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-sm border transition-colors hover:bg-black/5"
                        style={{ borderColor: "oklch(0.88 0.012 80)", color: "oklch(0.52 0.016 80)" }}
                      >
                        <Copy size={11} /> Schema
                      </button>
                      <button
                        onClick={() => handleExportMarkdown(generatedContent)}
                        disabled={generatedStatus !== "approved"}
                        title={generatedStatus === "approved" ? "Export approved draft" : "Approve this reviewed draft before export"}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-sm border transition-colors hover:bg-black/5"
                        style={{ borderColor: "oklch(0.88 0.012 80)", color: "oklch(0.52 0.016 80)", opacity: generatedStatus === "approved" ? 1 : 0.5 }}
                      >
                        <Download size={11} /> Export MD
                      </button>
                    </div>
                  </div>

                  {/* Preview body */}
                  <div className="p-4">
                    <ContentPreview content={generatedContent} />
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-sm border flex items-center justify-center py-24"
                  style={{ borderColor: "oklch(0.88 0.012 80)", background: "oklch(0.98 0.004 80)" }}
                >
                  <div className="text-center">
                    <FileText size={32} style={{ color: "oklch(0.80 0.008 80)" }} className="mx-auto mb-3" />
                    <p className="text-sm" style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}>
                      Select a territory and suburb, then click Generate to produce page content.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            {(listQuery.data || []).length === 0 ? (
              <div className="text-center py-12" style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}>
                No suburb pages generated yet. Switch to the "Generate New" tab to create your first page.
              </div>
            ) : (
              (listQuery.data || []).map((page: any) => (
                <div
                  key={page.id}
                  className="rounded-sm border p-4 flex items-center justify-between"
                  style={{ borderColor: "oklch(0.88 0.012 80)", background: "oklch(1 0 0)" }}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold" style={{ color: "oklch(0.18 0.015 65)", fontFamily: "Inter, sans-serif" }}>
                        {page.suburbName}
                      </span>
                      <StatusBadge status={page.status} />
                    </div>
                    <div className="text-xs" style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
                      {page.territoryId} · {page.wordCount} words · {new Date(page.generatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenHistory(page.id, page.status)}
                      className="text-xs px-2 py-1 rounded-sm border"
                      style={{ borderColor: "oklch(0.88 0.012 80)", color: "oklch(0.68 0.20 140)" }}
                    >
                      View
                    </button>
                    {page.status === "draft" && (
                      <button
                        onClick={() => updateStatusMutation.mutateAsync({ id: page.id, status: "in_review" }).then(() => listQuery.refetch())}
                        className="text-xs px-2 py-1 rounded-sm border"
                        style={{ borderColor: "oklch(0.88 0.012 80)", color: "oklch(0.52 0.016 80)" }}
                      >
                        Send for Review
                      </button>
                    )}
                    {page.status === "in_review" && (
                      <button
                        onClick={() => updateStatusMutation.mutateAsync({ id: page.id, status: "approved" }).then(() => {
                          if (generatedPageId === page.id) setGeneratedStatus("approved");
                          listQuery.refetch();
                        })}
                        disabled={generatedPageId !== page.id}
                        title={generatedPageId === page.id ? "Approve reviewed page" : "Open the page before approval"}
                        className="text-xs px-2 py-1 rounded-sm text-white"
                        style={{ background: "oklch(0.68 0.20 140)", opacity: generatedPageId === page.id ? 1 : 0.5 }}
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
