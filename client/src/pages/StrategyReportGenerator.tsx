import { useState, useRef } from "react";
import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { FileText, Download, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface StrategyConfig {
  currentGbpPostsPerMonth: number;
  currentBlogPostsPerMonth: number;
  proposedGbpPostsPerMonth: number;
  proposedBlogPostsPerMonth: number;
  proposedSuburbPages: number;
  proposedSpeciesLocationPages: number;
  campaignNotes: string;
}

export default function StrategyReportGenerator() {
  const { user } = useAuth();
  const [selectedTerritory, setSelectedTerritory] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [config, setConfig] = useState<StrategyConfig>({
    currentGbpPostsPerMonth: 0,
    currentBlogPostsPerMonth: 0,
    proposedGbpPostsPerMonth: 0,
    proposedBlogPostsPerMonth: 0,
    proposedSuburbPages: 0,
    proposedSpeciesLocationPages: 0,
    campaignNotes: "",
  });

  // Fetch territories
  const { data: territories, isLoading: loadingTerritories } = trpc.strategyReport.getTerritories.useQuery();

  // Preview mutation (HTML only, faster)
  const previewMutation = trpc.strategyReport.preview.useMutation({
    onMutate: () => {
      setIsGenerating(true);
      setError(null);
      setPdfUrl(null);
      setPreviewHtml(null);
      setProgress(0);
      setProgressLabel("Initializing...");
      // Simulate progress since we can't stream from tRPC mutation
      simulateProgress();
    },
    onSuccess: (data) => {
      setPreviewHtml(data.html);
      setProgress(100);
      setProgressLabel(`Complete — ${data.sectionCount} sections generated`);
      setIsGenerating(false);
    },
    onError: (err) => {
      setError(err.message || "Failed to generate report preview");
      setIsGenerating(false);
      setProgress(0);
    },
  });

  // Full generation mutation (HTML + PDF)
  const generateMutation = trpc.strategyReport.generate.useMutation({
    onMutate: () => {
      setIsGenerating(true);
      setError(null);
      setPdfUrl(null);
      setProgress(0);
      setProgressLabel("Generating report + PDF...");
      simulateProgress();
    },
    onSuccess: (data) => {
      setPdfUrl(data.url);
      setPreviewHtml(data.html);
      setProgress(100);
      setProgressLabel(`Complete — PDF ready (${data.sectionCount} sections)`);
      setIsGenerating(false);
    },
    onError: (err) => {
      setError(err.message || "Failed to generate report");
      setIsGenerating(false);
      setProgress(0);
    },
  });

  const exportMutation = trpc.strategyReport.exportPdf.useMutation({
    onMutate: () => {
      setIsGenerating(true);
      setError(null);
      setProgressLabel("Exporting reviewed preview...");
    },
    onSuccess: (data) => {
      setPdfUrl(data.url);
      setProgress(100);
      setProgressLabel("Complete — reviewed PDF ready");
      setIsGenerating(false);
    },
    onError: (err) => {
      setError(err.message || "Failed to export report");
      setIsGenerating(false);
    },
  });

  // Simulate progress for UX (actual generation takes 2-4 minutes)
  function simulateProgress() {
    const sections = [
      { pct: 8, label: "Building territory data..." },
      { pct: 15, label: "Writing Executive Summary..." },
      { pct: 22, label: "Building Current Campaign..." },
      { pct: 28, label: "Building Species Analysis..." },
      { pct: 35, label: "Building Suburb Revenue..." },
      { pct: 40, label: "Building GBP Performance..." },
      { pct: 50, label: "Writing Gap Analysis..." },
      { pct: 60, label: "Writing Proposed Program..." },
      { pct: 65, label: "Building Scale Comparison..." },
      { pct: 72, label: "Writing Content Architecture..." },
      { pct: 78, label: "Writing GBP Strategy..." },
      { pct: 85, label: "Writing 90-Day Action Plan..." },
      { pct: 90, label: "Writing Delivery Dependencies..." },
      { pct: 95, label: "Writing Recommendations..." },
      { pct: 97, label: "Assembling document..." },
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < sections.length) {
        setProgress(sections[i].pct);
        setProgressLabel(sections[i].label);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 12000); // ~12s per section (total ~3 min)

    // Store interval ID for cleanup
    (window as any).__strategyProgressInterval = interval;
  }

  function handlePreview() {
    if (!selectedTerritory) return;
    if ((window as any).__strategyProgressInterval) {
      clearInterval((window as any).__strategyProgressInterval);
    }
    previewMutation.mutate({ territoryId: selectedTerritory, config });
  }

  function handleGeneratePdf() {
    if (!selectedTerritory) return;
    if ((window as any).__strategyProgressInterval) {
      clearInterval((window as any).__strategyProgressInterval);
    }
    if (previewHtml) {
      exportMutation.mutate({ territoryId: selectedTerritory, html: previewHtml });
    } else {
      generateMutation.mutate({ territoryId: selectedTerritory, config });
    }
  }

  function handleReset() {
    if ((window as any).__strategyProgressInterval) {
      clearInterval((window as any).__strategyProgressInterval);
    }
    setSelectedTerritory("");
    setPreviewHtml(null);
    setPdfUrl(null);
    setError(null);
    setProgress(0);
    setProgressLabel("");
    setIsGenerating(false);
  }

  // Admin gate
  if (user?.role !== "admin") {
    return (
      <PortalLayout>
        <div className="px-6 py-8">
          <p style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
            Strategy Report Generator is restricted to admin users.
          </p>
        </div>
      </PortalLayout>
    );
  }

  const selectedTerritoryData = territories?.find(t => t.id === selectedTerritory);
  const updateConfigNumber = (key: keyof StrategyConfig, value: string) => {
    setConfig(previous => ({ ...previous, [key]: Math.max(0, Number(value) || 0) }));
    setPreviewHtml(null);
    setPdfUrl(null);
  };

  return (
    <PortalLayout>
      <div className="px-6 py-8 max-w-5xl">
        {/* Page Header */}
        <div className="mb-8">
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "oklch(0.42 0.09 145)", fontFamily: "Inter, sans-serif" }}
          >
            Document Generator
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}
          >
            Strategy Report Generator
          </h1>
          <p
            className="text-sm"
            style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
          >
            Generate a reviewable territory strategy from verified demand/performance data and explicitly confirmed campaign inputs.
          </p>
          <div className="mt-3" style={{ borderTop: "2px solid oklch(0.32 0.09 145)", width: "48px" }} />
        </div>

        {/* Territory Selection Card */}
        <div
          className="rounded-sm border p-6 mb-6"
          style={{ background: "oklch(1 0 0)", borderColor: "oklch(0.88 0.012 80)" }}
        >
          <h2
            className="text-sm font-bold mb-4"
            style={{ color: "oklch(0.18 0.015 65)", fontFamily: "Inter, sans-serif" }}
          >
            Select Territory
          </h2>

          {loadingTerritories ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.52 0.016 80)" }}>
              <Loader2 size={14} className="animate-spin" /> Loading territories...
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <select
                value={selectedTerritory}
                onChange={(e) => {
                  setSelectedTerritory(e.target.value);
                  setPreviewHtml(null);
                  setPdfUrl(null);
                  setError(null);
                }}
                disabled={isGenerating}
                className="w-full max-w-md px-3 py-2 rounded-sm border text-sm"
                style={{
                  borderColor: "oklch(0.88 0.012 80)",
                  fontFamily: "Inter, sans-serif",
                  color: "oklch(0.18 0.015 65)",
                }}
              >
                <option value="">Choose a territory...</option>
                {territories?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.city}, {t.state} ({t.country === "CA" ? "CAD" : "USD"}{" "}
                    {t.revenue > 0 ? `$${(t.revenue / 1000000).toFixed(2)}M` : "No data"})
                  </option>
                ))}
              </select>

              {selectedTerritory && (
                <div className="border-t pt-4" style={{ borderColor: "oklch(0.90 0.008 80)" }}>
                  <h3 className="text-sm font-bold" style={{ color: "oklch(0.18 0.015 65)" }}>Confirm campaign scope</h3>
                  <p className="text-xs mt-1 mb-3" style={{ color: "oklch(0.52 0.016 80)" }}>
                    Zero means “not provided.” The report will flag the gap instead of inventing a publishing or page-build volume.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {([
                      ["Current GBP / month", "currentGbpPostsPerMonth"],
                      ["Current blogs / month", "currentBlogPostsPerMonth"],
                      ["Proposed GBP / month", "proposedGbpPostsPerMonth"],
                      ["Proposed blogs / month", "proposedBlogPostsPerMonth"],
                      ["Proposed suburb pages", "proposedSuburbPages"],
                      ["Proposed species × location", "proposedSpeciesLocationPages"],
                    ] as Array<[string, keyof StrategyConfig]>).map(([label, key]) => (
                      <label key={key}>
                        <span className="text-xs" style={{ color: "oklch(0.52 0.016 80)" }}>{label}</span>
                        <input
                          type="number"
                          min="0"
                          value={config[key] as number}
                          onChange={event => updateConfigNumber(key, event.target.value)}
                          className="mt-1 block w-full border rounded-sm px-3 py-2 text-sm"
                          style={{ borderColor: "oklch(0.88 0.012 80)" }}
                        />
                      </label>
                    ))}
                  </div>
                  <label className="block mt-3">
                    <span className="text-xs" style={{ color: "oklch(0.52 0.016 80)" }}>Confirmed program notes</span>
                    <textarea
                      value={config.campaignNotes}
                      onChange={event => {
                        setConfig(previous => ({ ...previous, campaignNotes: event.target.value }));
                        setPreviewHtml(null);
                        setPdfUrl(null);
                      }}
                      rows={3}
                      placeholder="Current deliverables, approved scope, exclusions, owners, or capacity constraints."
                      className="mt-1 block w-full border rounded-sm px-3 py-2 text-sm"
                      style={{ borderColor: "oklch(0.88 0.012 80)" }}
                    />
                  </label>
                </div>
              )}

              {selectedTerritory && !isGenerating && (
                <div className="flex gap-3">
                  <button
                    onClick={handlePreview}
                    className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold transition-all"
                    style={{
                      background: "oklch(0.32 0.09 145)",
                      color: "white",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    <FileText size={14} /> Preview Report
                  </button>
                  <button
                    onClick={handleGeneratePdf}
                    className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold transition-all"
                    style={{
                      background: "oklch(0.18 0.015 65)",
                      color: "white",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    <Download size={14} /> Generate PDF
                  </button>
                </div>
              )}

              {(previewHtml || pdfUrl) && !isGenerating && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium transition-all w-fit"
                  style={{
                    border: "1px solid oklch(0.88 0.012 80)",
                    color: "oklch(0.52 0.016 80)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <RefreshCw size={12} /> Generate Another
                </button>
              )}
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        {isGenerating && (
          <div
            className="rounded-sm border p-6 mb-6"
            style={{ background: "oklch(0.97 0.012 80)", borderColor: "oklch(0.88 0.012 80)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <Loader2 size={16} className="animate-spin" style={{ color: "oklch(0.32 0.09 145)" }} />
              <span
                className="text-sm font-semibold"
                style={{ color: "oklch(0.32 0.09 145)", fontFamily: "Inter, sans-serif" }}
              >
                Generating Strategy Report...
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.90 0.012 80)" }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress}%`, background: "oklch(0.32 0.09 145)" }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
              {progressLabel} ({progress}%)
            </p>
            <p className="text-xs mt-1" style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}>
              Initial generation can take 2-4 minutes. Exporting an approved preview does not re-run the narrative.
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            className="rounded-sm border p-4 mb-6 flex items-start gap-3"
            style={{ background: "oklch(0.97 0.04 25)", borderColor: "oklch(0.85 0.08 25)" }}
          >
            <AlertCircle size={16} style={{ color: "oklch(0.55 0.20 27)", marginTop: 2 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "oklch(0.40 0.15 27)" }}>
                Generation Failed
              </p>
              <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.10 27)" }}>{error}</p>
            </div>
          </div>
        )}

        {/* PDF Download Success */}
        {pdfUrl && (
          <div
            className="rounded-sm border p-4 mb-6 flex items-start gap-3"
            style={{ background: "oklch(0.97 0.04 145)", borderColor: "oklch(0.85 0.08 145)" }}
          >
            <CheckCircle2 size={16} style={{ color: "oklch(0.42 0.12 145)", marginTop: 2 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "oklch(0.28 0.09 145)" }}>
                Strategy Report Generated Successfully
              </p>
              <p className="text-xs mt-1" style={{ color: "oklch(0.42 0.09 145)" }}>
                {selectedTerritoryData?.name} — Full strategy document ready for download.
              </p>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-sm text-sm font-semibold transition-all"
                style={{
                  background: "oklch(0.32 0.09 145)",
                  color: "white",
                  fontFamily: "Inter, sans-serif",
                  textDecoration: "none",
                }}
              >
                <Download size={14} /> Download PDF
              </a>
            </div>
          </div>
        )}

        {/* HTML Preview */}
        {previewHtml && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-sm font-bold"
                style={{ color: "oklch(0.18 0.015 65)", fontFamily: "Inter, sans-serif" }}
              >
                Report Preview
              </h2>
              {!pdfUrl && (
                <button
                  onClick={handleGeneratePdf}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all"
                  style={{
                    background: "oklch(0.18 0.015 65)",
                    color: "white",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <Download size={12} /> Export as PDF
                </button>
              )}
            </div>
            <div
              className="rounded-sm border overflow-hidden"
              style={{ borderColor: "oklch(0.88 0.012 80)", height: "800px" }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                className="w-full h-full"
                title="Strategy Report Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}

        {/* How It Works */}
        {!previewHtml && !isGenerating && !pdfUrl && (
          <div
            className="rounded-sm border p-6"
            style={{ background: "oklch(0.98 0.005 80)", borderColor: "oklch(0.88 0.012 80)" }}
          >
            <h3
              className="text-sm font-bold mb-3"
              style={{ color: "oklch(0.18 0.015 65)", fontFamily: "Inter, sans-serif" }}
            >
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-wider mb-1"
                  style={{ color: "oklch(0.42 0.09 145)" }}
                >
                  Step 1: Data Assembly
                </div>
                <p className="text-xs" style={{ color: "oklch(0.52 0.016 80)" }}>
                  Salesforce demand, GBP, GSC, and confirmed campaign inputs are assembled with their sources kept distinct.
                </p>
              </div>
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-wider mb-1"
                  style={{ color: "oklch(0.42 0.09 145)" }}
                >
                  Step 2: Section Generation
                </div>
                <p className="text-xs" style={{ color: "oklch(0.52 0.016 80)" }}>
                  13 sections are assembled. Data tables are deterministic; narrative sections use the established territory facts and confirmed scope.
                </p>
              </div>
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-wider mb-1"
                  style={{ color: "oklch(0.42 0.09 145)" }}
                >
                  Step 3: Document Assembly
                </div>
                <p className="text-xs" style={{ color: "oklch(0.52 0.016 80)" }}>
                  Review the branded HTML draft, then export that exact draft to PDF without regenerating it.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4" style={{ borderTop: "1px solid oklch(0.90 0.008 80)" }}>
              <p className="text-xs" style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}>
                <strong style={{ color: "oklch(0.42 0.09 145)" }}>Section order (Dave's gold standard):</strong>{" "}
                Executive Summary → Current Campaign → Species Analysis → Suburb Revenue → GBP Performance →
                Gap Analysis → Proposed Program → Scale Comparison → Content Architecture → GBP Strategy →
                90-Day Action Plan → Delivery Dependencies → Recommendations
              </p>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
