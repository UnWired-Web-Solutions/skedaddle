import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

interface ProposalConfig {
  currentMonthlyPrice: number;
  currentBlogPosts: number;
  currentGbpPosts: number;
  essentialPrice: number;
  essentialBlogPosts: number;
  essentialGbpPosts: number;
  growthPrice: number;
  growthBlogPosts: number;
  growthGbpPosts: number;
  acceleratorPrice: number;
  acceleratorBlogPosts: number;
  acceleratorGbpPosts: number;
  implementationFee: number;
  estimatedTokenCost: number;
  tokenBufferPercent: number;
  scopeNotes: string;
}

export default function ProposalGenerator() {
  const { user } = useAuth();
  const [selectedTerritory, setSelectedTerritory] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [config, setConfig] = useState<ProposalConfig>({
    currentMonthlyPrice: 0, currentBlogPosts: 0, currentGbpPosts: 0,
    essentialPrice: 0, essentialBlogPosts: 0, essentialGbpPosts: 0,
    growthPrice: 0, growthBlogPosts: 0, growthGbpPosts: 0,
    acceleratorPrice: 0, acceleratorBlogPosts: 0, acceleratorGbpPosts: 0,
    implementationFee: 0, estimatedTokenCost: 0, tokenBufferPercent: 0,
    scopeNotes: "",
  });

  const { data: territories, isLoading: loadingTerritories } =
    trpc.proposal.getTerritories.useQuery();

  const exportMutation = trpc.proposal.exportPdf.useMutation({
    onSuccess: (data) => {
      setPdfUrl(data.url);
      setGenerating(false);
    },
    onError: (err) => {
      setError(err.message);
      setGenerating(false);
    },
  });

  const previewMutation = trpc.proposal.preview.useMutation({
    onSuccess: (data) => {
      setPreviewHtml(data.html);
      setDraftId(data.draftId);
      setGenerating(false);
    },
    onError: (err) => {
      setError(err.message);
      setGenerating(false);
    },
  });

  const handlePreview = () => {
    if (!selectedTerritory || !termsConfirmed) return;
    setGenerating(true);
    setError(null);
    setPdfUrl(null);
    setPreviewHtml(null);
    setDraftId(null);
    previewMutation.mutate({ territoryId: selectedTerritory, config });
  };

  const handleGeneratePdf = () => {
    if (!selectedTerritory || !termsConfirmed) return;
    if (!draftId) {
      setError("Preview and review the proposal before exporting its saved draft.");
      return;
    }
    setGenerating(true);
    setError(null);
    setPdfUrl(null);
    exportMutation.mutate({ draftId });
  };

  const selectedTerritoryData = territories?.find((t) => t.id === selectedTerritory);
  const updateNumber = (key: keyof ProposalConfig, value: string) => {
    setConfig(previous => ({ ...previous, [key]: Math.max(0, Number(value) || 0) }));
    setTermsConfirmed(false);
    setPreviewHtml(null);
    setDraftId(null);
    setPdfUrl(null);
  };

  const formatRevenue = (revenue: number | null, id: string) => {
    if (revenue === null) return "Matched-period data loads after selection";
    const territory = territories?.find((t) => t.id === id);
    const symbol = territory?.country === "CA" ? "CA$" : "$";
    return revenue >= 1_000_000
      ? `${symbol}${(revenue / 1_000_000).toFixed(2)}M`
      : `${symbol}${(revenue / 1_000).toFixed(0)}K`;
  };

  if (user?.role !== "admin") {
    return (
      <PortalLayout>
        <div className="px-6 py-8">
          <p style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
            Access restricted to administrators.
          </p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="px-6 py-8 max-w-6xl">
        {/* Page header */}
        <div className="mb-8">
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "oklch(0.75 0.18 140)", fontFamily: "Inter, sans-serif" }}
          >
            Sales Tools
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: "oklch(0.18 0.015 65)",
            }}
          >
            Proposal Generator
          </h1>
          <div
            className="text-sm"
            style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
          >
            Generate branded 3-page franchise proposals with territory-specific data and
            AI-written narrative.
          </div>
          <div
            className="mt-3"
            style={{ borderTop: "2px solid oklch(0.68 0.20 140)", width: "48px" }}
          />
        </div>

        {/* Territory selector */}
        <div
          className="rounded-sm border p-6 mb-6"
          style={{
            background: "oklch(1 0 0)",
            borderColor: "oklch(0.88 0.012 80)",
          }}
        >
          <h2
            className="text-sm font-bold mb-4"
            style={{
              color: "oklch(0.18 0.015 65)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Select Territory
          </h2>

          {loadingTerritories ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.52 0.016 80)" }}>
              <Loader2 size={14} className="animate-spin" /> Loading territories...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <select
                  value={selectedTerritory}
                  onChange={(e) => {
                    setSelectedTerritory(e.target.value);
                    setTermsConfirmed(false);
                    setPreviewHtml(null);
                    setDraftId(null);
                    setPdfUrl(null);
                    setError(null);
                  }}
                  className="w-full border rounded-sm px-3 py-2 text-sm"
                  style={{
                    borderColor: "oklch(0.88 0.012 80)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <option value="">Choose a territory...</option>
                  {territories?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {formatRevenue(t.revenue, t.id)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTerritoryData && (
                <div
                  className="text-sm p-3 rounded-sm"
                  style={{
                    background: "oklch(0.97 0.012 145)",
                    border: "1px solid oklch(0.88 0.04 145)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <div style={{ color: "oklch(0.68 0.20 140)" }}>
                    <strong>{selectedTerritoryData.name}</strong>
                  </div>
                  <div style={{ color: "oklch(0.52 0.016 80)" }}>
                    {selectedTerritoryData.city}, {selectedTerritoryData.state} ·{" "}
                    {selectedTerritoryData.country === "CA" ? "Canada" : "United States"}
                  </div>
                  <div style={{ color: "oklch(0.75 0.18 140)", fontWeight: 600 }}>
                    {formatRevenue(selectedTerritoryData.revenue, selectedTerritoryData.id)}{" "}
                    source-qualified sales context
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTerritory && (
            <div className="mt-5 border-t pt-5" style={{ borderColor: "oklch(0.90 0.008 80)" }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: "oklch(0.18 0.015 65)" }}>Confirm commercial assumptions</h3>
                  <p className="text-xs mt-1" style={{ color: "oklch(0.52 0.016 80)" }}>
                    These values are proposal inputs, not inferred from Salesforce. Prices use the territory currency.
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                  <thead>
                    <tr style={{ color: "oklch(0.52 0.016 80)" }}>
                      <th className="text-left py-2">Plan</th>
                      <th className="text-left py-2">Monthly price</th>
                      <th className="text-left py-2">Blogs / month</th>
                      <th className="text-left py-2">GBP posts / month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      ["Current", "currentMonthlyPrice", "currentBlogPosts", "currentGbpPosts"],
                      ["Essential", "essentialPrice", "essentialBlogPosts", "essentialGbpPosts"],
                      ["Growth", "growthPrice", "growthBlogPosts", "growthGbpPosts"],
                      ["Accelerator", "acceleratorPrice", "acceleratorBlogPosts", "acceleratorGbpPosts"],
                    ] as Array<[string, keyof ProposalConfig, keyof ProposalConfig, keyof ProposalConfig]>).map(([label, priceKey, blogKey, gbpKey]) => (
                      <tr key={label} style={{ borderTop: "1px solid oklch(0.93 0.008 80)" }}>
                        <td className="py-2 pr-3 font-semibold">{label}</td>
                        {[priceKey, blogKey, gbpKey].map(key => (
                          <td key={key} className="py-2 pr-3">
                            <input
                              type="number"
                              min="0"
                              value={config[key] as number}
                              onChange={event => updateNumber(key, event.target.value)}
                              className="w-28 border rounded-sm px-2 py-1.5"
                              style={{ borderColor: "oklch(0.88 0.012 80)" }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                {([
                  ["Implementation fee", "implementationFee"],
                  ["Estimated token cost", "estimatedTokenCost"],
                  ["Exploration buffer (%)", "tokenBufferPercent"],
                ] as Array<[string, keyof ProposalConfig]>).map(([label, key]) => (
                  <label key={key}>
                    <span className="text-xs font-medium" style={{ color: "oklch(0.52 0.016 80)" }}>{label}</span>
                    <input
                      type="number"
                      min="0"
                      max={key === "tokenBufferPercent" ? "100" : undefined}
                      value={config[key] as number}
                      onChange={event => updateNumber(key, event.target.value)}
                      className="mt-1 w-full border rounded-sm px-2 py-1.5"
                      style={{ borderColor: "oklch(0.88 0.012 80)" }}
                    />
                  </label>
                ))}
              </div>
              <label className="block mt-3">
                <span className="text-xs font-medium" style={{ color: "oklch(0.52 0.016 80)" }}>Approved scope notes</span>
                <textarea
                  value={config.scopeNotes}
                  onChange={event => {
                    setConfig(previous => ({ ...previous, scopeNotes: event.target.value }));
                    setTermsConfirmed(false);
                    setPreviewHtml(null);
                    setDraftId(null);
                    setPdfUrl(null);
                  }}
                  placeholder="Required: approved inclusions, exclusions, rollout limits, and franchise-specific terms."
                  className="mt-1 w-full border rounded-sm px-3 py-2 text-sm"
                  rows={3}
                  style={{ borderColor: "oklch(0.88 0.012 80)" }}
                />
              </label>
              <label className="flex items-start gap-2 mt-3 text-xs" style={{ color: "oklch(0.35 0.015 65)" }}>
                <input type="checkbox" checked={termsConfirmed} disabled={!config.scopeNotes.trim()} onChange={event => setTermsConfirmed(event.target.checked)} className="mt-0.5" />
                <span>I confirmed these prices, deliverable volumes, token allowance and buffer, currency, and scope for this territory.</span>
              </label>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={handlePreview}
              disabled={!selectedTerritory || !termsConfirmed || !draftId || generating}
              className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold transition-all"
              style={{
                background: selectedTerritory && termsConfirmed && !generating ? "oklch(0.97 0.012 80)" : "oklch(0.94 0.008 80)",
                border: "1px solid oklch(0.88 0.012 80)",
                color: selectedTerritory && termsConfirmed && !generating ? "oklch(0.68 0.20 140)" : "oklch(0.65 0.010 80)",
                cursor: selectedTerritory && termsConfirmed && !generating ? "pointer" : "not-allowed",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {generating && previewMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              Preview Proposal
            </button>

            <button
              onClick={handleGeneratePdf}
              disabled={!selectedTerritory || !termsConfirmed || generating}
              className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold transition-all"
              style={{
                background: selectedTerritory && termsConfirmed && draftId && !generating ? "oklch(0.68 0.20 140)" : "oklch(0.65 0.010 80)",
                color: "white",
                cursor: selectedTerritory && termsConfirmed && draftId && !generating ? "pointer" : "not-allowed",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {generating && exportMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              {draftId ? "Export Reviewed PDF" : "Preview First"}
            </button>
          </div>

          {/* Status messages */}
          {generating && (
            <div
              className="mt-4 text-sm flex items-center gap-2"
              style={{ color: "oklch(0.75 0.18 140)", fontFamily: "Inter, sans-serif" }}
            >
              <Loader2 size={14} className="animate-spin" />
              {exportMutation.isPending ? "Exporting the reviewed preview..." : "Generating proposal narrative and layout... This takes 15-30 seconds."}
            </div>
          )}

          {error && (
            <div
              className="mt-4 text-sm p-3 rounded-sm"
              style={{
                background: "oklch(0.97 0.04 27)",
                border: "1px solid oklch(0.85 0.08 27)",
                color: "oklch(0.45 0.15 27)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Error: {error}
            </div>
          )}

          {pdfUrl && (
            <div
              className="mt-4 p-4 rounded-sm"
              style={{
                background: "oklch(0.97 0.012 145)",
                border: "1px solid oklch(0.88 0.04 145)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: "oklch(0.68 0.20 140)", fontFamily: "Inter, sans-serif" }}
                  >
                    Proposal Generated Successfully
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
                  >
                    {selectedTerritoryData?.name} Franchise Digital Marketing Proposal
                  </div>
                </div>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{
                    background: "oklch(0.68 0.20 140)",
                    color: "white",
                    fontFamily: "Inter, sans-serif",
                    textDecoration: "none",
                  }}
                >
                  <Download size={14} />
                  Download PDF
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Preview area */}
        {previewHtml && (
          <div
            className="rounded-sm border"
            style={{
              borderColor: "oklch(0.88 0.012 80)",
              background: "oklch(0.97 0.005 80)",
            }}
          >
            <div
              className="px-5 py-3 border-b flex items-center justify-between"
              style={{ borderColor: "oklch(0.88 0.012 80)" }}
            >
              <div
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
              >
                Proposal Preview
              </div>
              <button
                onClick={handleGeneratePdf}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold"
                style={{
                  background: "oklch(0.68 0.20 140)",
                  color: "white",
                  fontFamily: "Inter, sans-serif",
                  cursor: generating ? "not-allowed" : "pointer",
                }}
              >
                <Download size={12} />
                Export as PDF
              </button>
            </div>
            <div className="p-4">
              <iframe
                srcDoc={previewHtml}
                className="w-full border-0 rounded-sm"
                style={{
                  height: "1200px",
                  background: "white",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
                title="Proposal Preview"
              />
            </div>
          </div>
        )}

        {/* Info section */}
        {!previewHtml && !pdfUrl && (
          <div
            className="rounded-sm border p-5"
            style={{
              background: "oklch(0.97 0.012 80)",
              borderColor: "oklch(0.88 0.012 80)",
            }}
          >
            <h3
              className="text-sm font-bold mb-3"
              style={{ color: "oklch(0.68 0.20 140)", fontFamily: "Inter, sans-serif" }}
            >
              How It Works
            </h3>
            <div
              className="text-sm space-y-2"
              style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
            >
              <p>
                <strong style={{ color: "oklch(0.32 0.015 65)" }}>1.</strong> Select a
                territory from the dropdown above.
              </p>
              <p>
                <strong style={{ color: "oklch(0.32 0.015 65)" }}>2.</strong> Click
                "Preview Proposal" to generate a branded 3-page proposal with
                territory-specific data and AI-written narrative.
              </p>
              <p>
                <strong style={{ color: "oklch(0.32 0.015 65)" }}>3.</strong> Review the
                preview, then click "Generate PDF" to create a downloadable PDF.
              </p>
              <p>
                <strong style={{ color: "oklch(0.32 0.015 65)" }}>4.</strong> Send the
                PDF to the franchise owner after your strategy meeting. The PDF is rendered from the exact preview you reviewed.
              </p>
            </div>
            <div
              className="mt-4 text-xs"
              style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}
            >
              The proposal auto-fills city names, source-qualified sales figures, seasonal timing, and
              species data from the territory snapshot. Commercial terms always come from the confirmed inputs above; the opening narrative is generated once per draft.
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
