// Skedaddle GBP Image Generator
// Generates branded GBP post images from post titles/bodies via fal.ai Flux Pro
// Three input methods: Single Post, Bulk Manual, CSV Upload

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState, useRef, useCallback } from "react";
import { Download, ImageIcon, Plus, Trash2, Upload, Loader2, CheckCircle2, XCircle, Sparkles, ZoomIn, X, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import React from "react";
import PortalLayout from "@/components/PortalLayout";

// ── Types ─────────────────────────────────────────────────────────────────────
interface BulkPost {
  id: string;
  title: string;
  body: string;
  territory: string;
  suburb: string;
}

interface GeneratedImage {
  url: string;
  filename: string;
  serviceLabel: string;
  prompt: string;
  title: string;
  territory: string;
  suburb: string;
  body: string;
  success: boolean;
  error?: string;
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
interface LightboxProps {
  images: GeneratedImage[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onRegenerate: (index: number) => void;
  regeneratingIndex: number | null;
}

function Lightbox({ images, currentIndex, onClose, onNavigate, onRegenerate, regeneratingIndex }: LightboxProps) {
  const img = images[currentIndex];
  if (!img) return null;

  // Skip failed images when navigating
  const hasPrev = images.slice(0, currentIndex).some((im) => im.success);
  const hasNext = images.slice(currentIndex + 1).some((im) => im.success);

  const goPrev = () => {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (images[i].success) { onNavigate(i); return; }
    }
  };
  const goNext = () => {
    for (let i = currentIndex + 1; i < images.length; i++) {
      if (images[i].success) { onNavigate(i); return; }
    }
  };
  const isRegenerating = regeneratingIndex === currentIndex;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && hasPrev) goPrev();
    if (e.key === "ArrowRight" && hasNext) goNext();
  }, [currentIndex, hasPrev, hasNext, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Main container */}
      <div
        className="relative flex flex-col max-w-4xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image area */}
        <div className="relative">
          {isRegenerating ? (
            <div
              className="w-full flex items-center justify-center rounded-lg"
              style={{ aspectRatio: "4/3", background: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={36} className="animate-spin text-white opacity-70" />
                <p className="text-sm text-white opacity-60">Regenerating image…</p>
              </div>
            </div>
          ) : (
            <img
              src={img.url}
              alt={img.serviceLabel}
              className="w-full h-auto max-h-[65vh] object-contain rounded-lg shadow-2xl"
            />
          )}

          {/* Service label badge */}
          <div className="absolute top-3 left-3">
            <Badge className="text-xs" style={{ background: "oklch(0.68 0.20 140)", color: "white" }}>
              {img.serviceLabel}
            </Badge>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
            aria-label="Close lightbox"
          >
            <X size={16} />
          </button>

          {/* Prev arrow */}
          {hasPrev && (
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
              style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Next arrow */}
          {hasNext && (
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
              style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>

        {/* Below-image bar: title, counter, actions */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white opacity-90 truncate font-medium">{img.title}</p>
            {images.length > 1 && (
              <p className="text-xs text-white opacity-50 mt-0.5">{currentIndex + 1} / {images.length}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onRegenerate(currentIndex)}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.25)" }}
              title="Regenerate this image with a new variation"
            >
              {isRegenerating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              Regenerate
            </button>
            <a
              href={img.url}
              download={img.filename}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded transition-opacity hover:opacity-80"
              style={{ background: "oklch(0.68 0.20 140)", color: "white" }}
            >
              <Download size={11} /> Download
            </a>
          </div>
        </div>

        {/* AI Prompt display */}
        {img.prompt && (
          <div
            className="mt-3 rounded-lg p-3 text-xs leading-relaxed"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)" }}
          >
            <span className="font-semibold uppercase tracking-wider text-white opacity-50 text-[10px] block mb-1">AI Prompt</span>
            {img.prompt}
          </div>
        )}

        {/* Thumbnail strip (when multiple images) */}
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((thumb, i) => (
              <button
                key={i}
                onClick={() => onNavigate(i)}
                className="shrink-0 rounded overflow-hidden transition-all"
                style={{
                  width: 56,
                  height: 42,
                  outline: i === currentIndex ? "2px solid oklch(0.68 0.20 140)" : "2px solid transparent",
                  opacity: i === currentIndex ? 1 : 0.55,
                }}
                aria-label={`Go to image ${i + 1}`}
              >
                {thumb.success ? (
                  <img src={thumb.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <XCircle size={14} className="text-red-400" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Territory Select ──────────────────────────────────────────────────────────
function TerritorySelect({
  value,
  onChange,
  territories,
}: {
  value: string;
  onChange: (v: string) => void;
  territories: Array<{ id: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder="Select territory" />
      </SelectTrigger>
      <SelectContent>
        {territories.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Image Result Card ─────────────────────────────────────────────────────────
function ImageCard({
  img,
  onOpenLightbox,
}: {
  img: GeneratedImage;
  onOpenLightbox: () => void;
}) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: "oklch(0.88 0.012 80)", background: "oklch(1 0 0)" }}
    >
      {img.success ? (
        <>
          <div
            className="relative aspect-[4/3] bg-gray-100 cursor-zoom-in"
            onClick={onOpenLightbox}
          >
            <img src={img.url} alt={img.serviceLabel} className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2">
              <Badge className="text-xs" style={{ background: "oklch(0.68 0.20 140)", color: "white" }}>
                {img.serviceLabel}
              </Badge>
            </div>
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.25)" }}
            >
              <ZoomIn size={28} color="white" />
            </div>
          </div>
          <div className="p-3 flex items-center justify-between gap-2">
            <p className="text-xs truncate flex-1" style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
              {img.title}
            </p>
            <a
              href={img.url}
              download={img.filename}
              className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-opacity hover:opacity-80"
              style={{ background: "oklch(0.68 0.20 140)", color: "white", fontFamily: "Inter, sans-serif" }}
            >
              <Download size={11} /> Save
            </a>
          </div>
        </>
      ) : (
        <div className="p-4 flex items-start gap-2">
          <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-600">Generation failed</p>
            <p className="text-xs mt-1" style={{ color: "oklch(0.52 0.016 80)" }}>{img.title}</p>
            <p className="text-xs mt-1 text-red-400">{img.error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Image Gallery with shared lightbox ───────────────────────────────────────
function ImageGallery({
  images,
  onImagesChange,
}: {
  images: GeneratedImage[];
  onImagesChange: (updated: GeneratedImage[]) => void;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const generateSingle = trpc.gbpImage.generateSingle.useMutation();

  const handleRegenerate = async (index: number) => {
    const img = images[index];
    if (!img || !img.territory) {
      toast.error("Cannot regenerate: missing territory data");
      return;
    }
    setRegeneratingIndex(index);
    try {
      const result = await generateSingle.mutateAsync({
        title: img.title,
        body: img.body || "",
        territory: img.territory,
        suburb: img.suburb || "",
      });
      const updated = images.map((item, i) =>
        i === index
          ? { ...item, url: result.url, filename: result.filename, serviceLabel: result.serviceLabel, prompt: result.prompt, success: true, error: undefined }
          : item
      );
      onImagesChange(updated);
      toast.success("Image regenerated!");
    } catch (err) {
      toast.error("Regeneration failed: " + String(err));
    } finally {
      setRegeneratingIndex(null);
    }
  };

  if (images.length === 0) return null;

  return (
    <>
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onRegenerate={handleRegenerate}
          regeneratingIndex={regeneratingIndex}
        />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((img, i) => (
          <ImageCard
            key={i}
            img={img}
            onOpenLightbox={() => setLightboxIndex(i)}
          />
        ))}
      </div>
    </>
  );
}

// ── Download All as ZIP (client-side via fetch + JSZip) ───────────────────────
async function downloadAllAsZip(images: GeneratedImage[]) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const folder = zip.folder("skedaddle-gbp-images")!;

  await Promise.all(
    images
      .filter((img) => img.success)
      .map(async (img) => {
        try {
          const resp = await fetch(img.url);
          const blob = await resp.blob();
          folder.file(img.filename, blob);
        } catch {
          // skip failed downloads
        }
      })
  );

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = "skedaddle-gbp-images.zip";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GbpImageGenerator() {
  const { data: territories = [] } = trpc.gbpImage.getTerritories.useQuery();

  // Single post state
  const [singleTitle, setSingleTitle] = useState("");
  const [singleBody, setSingleBody] = useState("");
  const [singleTerritory, setSingleTerritory] = useState("");
  const [singleSuburb, setSingleSuburb] = useState("");
  const [singleResults, setSingleResults] = useState<GeneratedImage[]>([]);

  // Bulk manual state
  const [bulkPosts, setBulkPosts] = useState<BulkPost[]>([
    { id: "1", title: "", body: "", territory: "", suburb: "" },
  ]);
  const [bulkResults, setBulkResults] = useState<GeneratedImage[]>([]);

  // CSV state
  const [csvPosts, setCsvPosts] = useState<BulkPost[]>([]);
  const [csvResults, setCsvResults] = useState<GeneratedImage[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Progress state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const generateSingle = trpc.gbpImage.generateSingle.useMutation();
  const generateBulk = trpc.gbpImage.generateBulk.useMutation();
  const trpcUtils = trpc.useUtils();

  // ── Poll job status helper ────────────────────────────────────────────────
  const pollJobStatus = async (
    jobId: string,
    validPosts: BulkPost[],
    setResults: (imgs: GeneratedImage[]) => void,
  ) => {
    const poll = async (): Promise<void> => {
      const status = await trpcUtils.gbpImage.getJobStatus.fetch({ jobId });
      if (!status.found) {
        toast.error("Job not found");
        setIsGenerating(false);
        return;
      }
      setProgress({ current: status.completed, total: status.total });

      if (status.status === "running" || (status.status === "completed" && status.completed < status.total)) {
        // Still running — poll again in 2s
        await new Promise((r) => setTimeout(r, 2000));
        return poll();
      }

      // Done — map results
      const mapped: GeneratedImage[] = status.results.map((r: { url: string; filename: string; serviceLabel: string; prompt: string; success: boolean; error?: string; index: number }, i: number) => ({
        url: r.url,
        filename: r.filename,
        serviceLabel: r.serviceLabel,
        prompt: r.prompt,
        title: validPosts[r.index]?.title ?? validPosts[i]?.title ?? "",
        territory: validPosts[r.index]?.territory ?? validPosts[i]?.territory ?? "",
        suburb: validPosts[r.index]?.suburb ?? validPosts[i]?.suburb ?? "",
        body: validPosts[r.index]?.body ?? validPosts[i]?.body ?? "",
        success: r.success,
        error: r.error,
      }));
      setResults(mapped);
      const successCount = mapped.filter((r) => r.success).length;
      toast.success(`${successCount} of ${mapped.length} images generated`);
      setIsGenerating(false);
    };
    await poll();
  };

  // ── Single Post Handler ───────────────────────────────────────────────────
  const handleSingleGenerate = async () => {
    if (!singleTitle.trim()) { toast.error("Please enter a post title"); return; }
    if (!singleTerritory) { toast.error("Please select a territory"); return; }
    setIsGenerating(true);
    setProgress({ current: 0, total: 1 });
    try {
      const result = await generateSingle.mutateAsync({
        title: singleTitle,
        body: singleBody,
        territory: singleTerritory,
        suburb: singleSuburb,
      });
      const newImg: GeneratedImage = {
        ...result,
        title: singleTitle,
        territory: singleTerritory,
        suburb: singleSuburb,
        body: singleBody,
        success: true,
      };
      setSingleResults((prev) => [newImg, ...prev]);
      setProgress({ current: 1, total: 1 });
      toast.success("Image generated!");
    } catch (err) {
      const errImg: GeneratedImage = {
        url: "", filename: "", serviceLabel: "", prompt: "",
        title: singleTitle, territory: singleTerritory, suburb: singleSuburb, body: singleBody,
        success: false, error: String(err),
      };
      setSingleResults((prev) => [errImg, ...prev]);
      toast.error("Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Bulk Manual Handler ───────────────────────────────────────────────────
  const handleBulkGenerate = async () => {
    const valid = bulkPosts.filter((p) => p.title.trim() && p.territory);
    if (valid.length === 0) { toast.error("Please fill in at least one post with a title and territory"); return; }
    setIsGenerating(true);
    setProgress({ current: 0, total: valid.length });
    setBulkResults([]);
    try {
      const { jobId } = await generateBulk.mutateAsync({
        posts: valid.map((p) => ({ title: p.title, body: p.body, territory: p.territory, suburb: p.suburb })),
      });
      await pollJobStatus(jobId, valid, setBulkResults);
    } catch (err) {
      toast.error("Bulk generation failed: " + String(err));
      setIsGenerating(false);
    }
  };

  // ── CSV Upload Handler ────────────────────────────────────────────────────
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { toast.error("CSV must have a header row and at least one data row"); return; }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
      const posts: BulkPost[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        const get = (key: string) => cols[headers.indexOf(key)] ?? "";
        const title = get("post_title") || get("title");
        const territory = get("territory");
        if (!title) continue;
        posts.push({
          id: String(i),
          title,
          body: get("post_body") || get("body") || "",
          territory: territory.toLowerCase().replace(/\s+/g, "-"),
          suburb: get("suburb") || "",
        });
      }
      setCsvPosts(posts);
      setCsvResults([]);
      toast.success(`Loaded ${posts.length} posts from CSV`);
    };
    reader.readAsText(file);
  };

  const handleCsvGenerate = async () => {
    if (csvPosts.length === 0) { toast.error("Please upload a CSV file first"); return; }
    const valid = csvPosts.filter((p) => p.title.trim() && p.territory);
    if (valid.length === 0) { toast.error("No valid posts found — ensure posts have a title and territory"); return; }
    setIsGenerating(true);
    setProgress({ current: 0, total: valid.length });
    setCsvResults([]);
    try {
      const { jobId } = await generateBulk.mutateAsync({
        posts: valid.map((p) => ({ title: p.title, body: p.body, territory: p.territory, suburb: p.suburb })),
      });
      await pollJobStatus(jobId, valid, setCsvResults);
    } catch (err) {
      toast.error("Generation failed: " + String(err));
      setIsGenerating(false);
    }
  };

  // ── Bulk post row helpers ─────────────────────────────────────────────────
  const addBulkRow = () => {
    setBulkPosts((prev) => [...prev, { id: Date.now().toString(), title: "", body: "", territory: "", suburb: "" }]);
  };
  const removeBulkRow = (id: string) => {
    setBulkPosts((prev) => prev.filter((p) => p.id !== id));
  };
  const updateBulkRow = (id: string, field: keyof BulkPost, value: string) => {
    setBulkPosts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const successResults = [...singleResults, ...bulkResults, ...csvResults].filter((r) => r.success);

  return (
    <PortalLayout>
      <div className="px-6 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "oklch(0.75 0.18 140)", fontFamily: "Inter, sans-serif" }}
          >
            GBP Tools
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}
          >
            GBP Image Generator
          </h1>
          <p className="text-sm" style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
            Generate branded Skedaddle images for Google Business Profile posts using AI.
          </p>
          <div className="mt-3" style={{ borderTop: "2px solid oklch(0.68 0.20 140)", width: "48px" }} />
        </div>

        {/* Progress bar */}
        {isGenerating && (
          <div className="mb-6 p-4 rounded-lg border" style={{ background: "oklch(0.97 0.012 80)", borderColor: "oklch(0.88 0.012 80)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "oklch(0.68 0.20 140)" }}>
                Generating images…
              </span>
              <span className="text-xs" style={{ color: "oklch(0.52 0.016 80)" }}>
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: "oklch(0.88 0.012 80)" }}>
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : "0%",
                  background: "oklch(0.68 0.20 140)",
                }}
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="single">
          <TabsList className="mb-6">
            <TabsTrigger value="single">Single Post</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Manual</TabsTrigger>
            <TabsTrigger value="csv">CSV Upload</TabsTrigger>
          </TabsList>

          {/* ── Single Post ── */}
          <TabsContent value="single">
            <div className="rounded-lg border p-6" style={{ borderColor: "oklch(0.88 0.012 80)", background: "oklch(1 0 0)" }}>
              <h2 className="text-base font-bold mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}>
                Single Post
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "oklch(0.52 0.016 80)" }}>
                    Post Title *
                  </label>
                  <Input
                    placeholder="e.g. Squirrel found in attic — Waukesha homeowner"
                    value={singleTitle}
                    onChange={(e) => setSingleTitle(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "oklch(0.52 0.016 80)" }}>
                    Territory *
                  </label>
                  <TerritorySelect value={singleTerritory} onChange={setSingleTerritory} territories={territories} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "oklch(0.52 0.016 80)" }}>
                    Suburb
                  </label>
                  <Input
                    placeholder="e.g. Waukesha"
                    value={singleSuburb}
                    onChange={(e) => setSingleSuburb(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "oklch(0.52 0.016 80)" }}>
                    Post Body (optional)
                  </label>
                  <Textarea
                    placeholder="Paste the post body here to help the AI generate a more relevant image…"
                    value={singleBody}
                    onChange={(e) => setSingleBody(e.target.value)}
                    className="text-sm min-h-[80px]"
                  />
                </div>
              </div>

              <Button
                onClick={handleSingleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2"
                style={{ background: "oklch(0.68 0.20 140)", color: "white" }}
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Generate Image
              </Button>

              {singleResults.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold" style={{ color: "oklch(0.18 0.015 65)" }}>
                      Generated Images ({singleResults.filter((r) => r.success).length} succeeded)
                    </h3>
                    {singleResults.filter((r) => r.success).length > 1 && (
                      <Button variant="outline" size="sm" className="text-xs flex items-center gap-1" onClick={() => downloadAllAsZip(singleResults)}>
                        <Download size={11} /> Download All ZIP
                      </Button>
                    )}
                  </div>
                  <ImageGallery images={singleResults} onImagesChange={setSingleResults} />
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Bulk Manual ── */}
          <TabsContent value="bulk">
            <div className="rounded-lg border p-6" style={{ borderColor: "oklch(0.88 0.012 80)", background: "oklch(1 0 0)" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}>
                  Bulk Manual Entry
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addBulkRow}
                  className="text-xs flex items-center gap-1"
                >
                  <Plus size={11} /> Add Row
                </Button>
              </div>

              <div className="space-y-3 mb-4">
                {bulkPosts.map((post, idx) => (
                  <div key={post.id} className="grid grid-cols-12 gap-2 items-start p-3 rounded-md" style={{ background: "oklch(0.97 0.008 80)" }}>
                    <div className="col-span-1 flex items-center justify-center pt-1.5">
                      <span className="text-xs font-mono" style={{ color: "oklch(0.65 0.010 80)" }}>{idx + 1}</span>
                    </div>
                    <div className="col-span-4">
                      <Input
                        placeholder="Post title *"
                        value={post.title}
                        onChange={(e) => updateBulkRow(post.id, "title", e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="col-span-4">
                      <TerritorySelect
                        value={post.territory}
                        onChange={(v) => updateBulkRow(post.id, "territory", v)}
                        territories={territories}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="Suburb"
                        value={post.suburb}
                        onChange={(e) => updateBulkRow(post.id, "suburb", e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBulkRow(post.id)}
                        disabled={bulkPosts.length === 1}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                    <div className="col-span-11 col-start-2">
                      <Textarea
                        placeholder="Post body (optional)"
                        value={post.body}
                        onChange={(e) => updateBulkRow(post.id, "body", e.target.value)}
                        className="text-xs min-h-[50px]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleBulkGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2"
                style={{ background: "oklch(0.68 0.20 140)", color: "white" }}
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Generate {bulkPosts.filter((p) => p.title && p.territory).length} Image{bulkPosts.filter((p) => p.title && p.territory).length !== 1 ? "s" : ""}
              </Button>

              {bulkResults.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold" style={{ color: "oklch(0.18 0.015 65)" }}>
                      Results — {bulkResults.filter((r) => r.success).length} of {bulkResults.length} succeeded
                    </h3>
                    {bulkResults.filter((r) => r.success).length > 1 && (
                      <Button variant="outline" size="sm" className="text-xs flex items-center gap-1" onClick={() => downloadAllAsZip(bulkResults)}>
                        <Download size={11} /> Download All ZIP
                      </Button>
                    )}
                  </div>
                  <ImageGallery images={bulkResults} onImagesChange={setBulkResults} />
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── CSV Upload ── */}
          <TabsContent value="csv">
            <div className="rounded-lg border p-6" style={{ borderColor: "oklch(0.88 0.012 80)", background: "oklch(1 0 0)" }}>
              <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}>
                CSV Upload
              </h2>
              <p className="text-xs mb-4" style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
                Upload a CSV with columns: <code className="bg-gray-100 px-1 rounded">post_title</code>, <code className="bg-gray-100 px-1 rounded">post_body</code> (optional), <code className="bg-gray-100 px-1 rounded">territory</code>, <code className="bg-gray-100 px-1 rounded">suburb</code> (optional)
              </p>

              {/* CSV template download */}
              <div className="mb-4 p-3 rounded-md flex items-center justify-between" style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.012 80)" }}>
                <span className="text-xs" style={{ color: "oklch(0.52 0.016 80)" }}>Need a template?</span>
                <a
                  href={`data:text/csv;charset=utf-8,post_title,post_body,territory,suburb\n"Squirrel found in attic","A homeowner called us after hearing scratching sounds...",milwaukee,Waukesha\n"Raccoon removal in Hamilton","Spring is peak season for raccoon activity...",hamilton,Ancaster`}
                  download="gbp_posts_template.csv"
                  className="text-xs font-semibold flex items-center gap-1"
                  style={{ color: "oklch(0.68 0.20 140)" }}
                >
                  <Download size={11} /> Download Template CSV
                </a>
              </div>

              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-green-400"
                style={{ borderColor: "oklch(0.78 0.05 145)" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={24} className="mx-auto mb-2" style={{ color: "oklch(0.52 0.016 80)" }} />
                {csvFileName ? (
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "oklch(0.68 0.20 140)" }}>{csvFileName}</p>
                    <p className="text-xs mt-1" style={{ color: "oklch(0.52 0.016 80)" }}>{csvPosts.length} posts loaded</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium" style={{ color: "oklch(0.52 0.016 80)" }}>Click to upload CSV</p>
                    <p className="text-xs mt-1" style={{ color: "oklch(0.65 0.010 80)" }}>or drag and drop</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvUpload}
                />
              </div>

              {csvPosts.length > 0 && (
                <div className="mt-4">
                  <div className="rounded-md overflow-hidden border" style={{ borderColor: "oklch(0.88 0.012 80)" }}>
                    <table className="w-full text-xs">
                      <thead style={{ background: "oklch(0.97 0.008 80)" }}>
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold" style={{ color: "oklch(0.52 0.016 80)" }}>#</th>
                          <th className="text-left px-3 py-2 font-semibold" style={{ color: "oklch(0.52 0.016 80)" }}>Title</th>
                          <th className="text-left px-3 py-2 font-semibold" style={{ color: "oklch(0.52 0.016 80)" }}>Territory</th>
                          <th className="text-left px-3 py-2 font-semibold" style={{ color: "oklch(0.52 0.016 80)" }}>Suburb</th>
                          <th className="text-left px-3 py-2 font-semibold" style={{ color: "oklch(0.52 0.016 80)" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPosts.slice(0, 10).map((post, i) => (
                          <tr key={post.id} style={{ borderTop: "1px solid oklch(0.93 0.008 80)" }}>
                            <td className="px-3 py-2" style={{ color: "oklch(0.65 0.010 80)" }}>{i + 1}</td>
                            <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: "oklch(0.18 0.015 65)" }}>{post.title}</td>
                            <td className="px-3 py-2" style={{ color: "oklch(0.52 0.016 80)" }}>{post.territory}</td>
                            <td className="px-3 py-2" style={{ color: "oklch(0.52 0.016 80)" }}>{post.suburb || "—"}</td>
                            <td className="px-3 py-2">
                              {post.title && post.territory ? (
                                <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={11} /> Ready</span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-400"><XCircle size={11} /> Missing fields</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvPosts.length > 10 && (
                      <div className="px-3 py-2 text-xs" style={{ color: "oklch(0.65 0.010 80)", borderTop: "1px solid oklch(0.93 0.008 80)" }}>
                        + {csvPosts.length - 10} more rows
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      onClick={handleCsvGenerate}
                      disabled={isGenerating}
                      className="flex items-center gap-2"
                      style={{ background: "oklch(0.68 0.20 140)", color: "white" }}
                    >
                      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      Generate {csvPosts.filter((p) => p.title && p.territory).length} Images
                    </Button>
                    <span className="text-xs" style={{ color: "oklch(0.65 0.010 80)" }}>
                      ~{Math.round(csvPosts.filter((p) => p.title && p.territory).length * 12 / 60)} min estimated
                    </span>
                  </div>
                </div>
              )}

              {csvResults.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold" style={{ color: "oklch(0.18 0.015 65)" }}>
                      Results — {csvResults.filter((r) => r.success).length} of {csvResults.length} succeeded
                    </h3>
                    {csvResults.filter((r) => r.success).length > 1 && (
                      <Button variant="outline" size="sm" className="text-xs flex items-center gap-1" onClick={() => downloadAllAsZip(csvResults)}>
                        <Download size={11} /> Download All ZIP
                      </Button>
                    )}
                  </div>
                  <ImageGallery images={csvResults} onImagesChange={setCsvResults} />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Info box */}
        <div className="mt-6 p-4 rounded-lg border text-sm" style={{ background: "oklch(0.97 0.012 80)", borderColor: "oklch(0.88 0.012 80)", color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
          <div className="flex items-start gap-2">
            <ImageIcon size={14} className="mt-0.5 shrink-0" style={{ color: "oklch(0.68 0.20 140)" }} />
            <div>
              <strong style={{ color: "oklch(0.68 0.20 140)" }}>How it works:</strong> AI reads the post, extracts the species and setting, then creates an illustrative 1024×768 image with a Skedaddle brand overlay. Review species accuracy, uniforms, property details, and local fit before publishing; generated images are not documentary job photos. Click any image to inspect the prompt or regenerate a variation.
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
