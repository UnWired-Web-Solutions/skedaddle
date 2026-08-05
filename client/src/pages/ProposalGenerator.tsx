import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

export default function ProposalGenerator() {
  const { user } = useAuth();
  const [selectedTerritory, setSelectedTerritory] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: territories, isLoading: loadingTerritories } =
    trpc.proposal.getTerritories.useQuery();

  const generateMutation = trpc.proposal.generate.useMutation({
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
      setGenerating(false);
    },
    onError: (err) => {
      setError(err.message);
      setGenerating(false);
    },
  });

  const handlePreview = () => {
    if (!selectedTerritory) return;
    setGenerating(true);
    setError(null);
    setPdfUrl(null);
    setPreviewHtml(null);
    previewMutation.mutate({ territoryId: selectedTerritory });
  };

  const handleGeneratePdf = () => {
    if (!selectedTerritory) return;
    setGenerating(true);
    setError(null);
    setPdfUrl(null);
    generateMutation.mutate({ territoryId: selectedTerritory });
  };

  const selectedTerritoryData = territories?.find((t) => t.id === selectedTerritory);

  const formatRevenue = (revenue: number, id: string) => {
    const territory = territories?.find((t) => t.id === id);
    const symbol = territory?.country === "CA" ? "CA$" : "$";
    return `${symbol}${(revenue / 1000).toFixed(0)}K`;
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
            style={{ color: "oklch(0.42 0.09 145)", fontFamily: "Inter, sans-serif" }}
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
            style={{ borderTop: "2px solid oklch(0.32 0.09 145)", width: "48px" }}
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
                    setPreviewHtml(null);
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
                      {t.name} — {formatRevenue(t.revenue, t.id)} T12 Revenue
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
                  <div style={{ color: "oklch(0.32 0.09 145)" }}>
                    <strong>{selectedTerritoryData.name}</strong>
                  </div>
                  <div style={{ color: "oklch(0.52 0.016 80)" }}>
                    {selectedTerritoryData.city}, {selectedTerritoryData.state} ·{" "}
                    {selectedTerritoryData.country === "CA" ? "Canada" : "United States"}
                  </div>
                  <div style={{ color: "oklch(0.42 0.09 145)", fontWeight: 600 }}>
                    {formatRevenue(selectedTerritoryData.revenue, selectedTerritoryData.id)}{" "}
                    trailing 12-month revenue
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={handlePreview}
              disabled={!selectedTerritory || generating}
              className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold transition-all"
              style={{
                background: selectedTerritory && !generating ? "oklch(0.97 0.012 80)" : "oklch(0.94 0.008 80)",
                border: "1px solid oklch(0.88 0.012 80)",
                color: selectedTerritory && !generating ? "oklch(0.32 0.09 145)" : "oklch(0.65 0.010 80)",
                cursor: selectedTerritory && !generating ? "pointer" : "not-allowed",
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
              disabled={!selectedTerritory || generating}
              className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold transition-all"
              style={{
                background: selectedTerritory && !generating ? "oklch(0.32 0.09 145)" : "oklch(0.65 0.010 80)",
                color: "white",
                cursor: selectedTerritory && !generating ? "pointer" : "not-allowed",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {generating && generateMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              Generate PDF
            </button>
          </div>

          {/* Status messages */}
          {generating && (
            <div
              className="mt-4 text-sm flex items-center gap-2"
              style={{ color: "oklch(0.42 0.09 145)", fontFamily: "Inter, sans-serif" }}
            >
              <Loader2 size={14} className="animate-spin" />
              Generating proposal with Claude Opus 5... This takes 15-30 seconds.
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
                    style={{ color: "oklch(0.32 0.09 145)", fontFamily: "Inter, sans-serif" }}
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
                    background: "oklch(0.32 0.09 145)",
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
                  background: "oklch(0.32 0.09 145)",
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
              style={{ color: "oklch(0.32 0.09 145)", fontFamily: "Inter, sans-serif" }}
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
                territory-specific data and AI-written narrative (Claude Opus 5).
              </p>
              <p>
                <strong style={{ color: "oklch(0.32 0.015 65)" }}>3.</strong> Review the
                preview, then click "Generate PDF" to create a downloadable PDF.
              </p>
              <p>
                <strong style={{ color: "oklch(0.32 0.015 65)" }}>4.</strong> Send the
                PDF to the franchise owner after your strategy meeting.
              </p>
            </div>
            <div
              className="mt-4 text-xs"
              style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}
            >
              The proposal auto-fills suburb names, revenue figures, seasonal timing, and
              species data from the territory's Salesforce data. The opening narrative is
              written fresh each time by Claude Opus 5 to sound natural and
              territory-specific.
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
