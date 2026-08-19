// Skedaddle GBP Image Generator
// Generates reviewable GBP post images from post titles/bodies via GPT Image 2
// Three input methods: Single Post, Bulk Manual, CSV Upload

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState, useRef, useCallback, useMemo } from "react";
import { Download, ImageIcon, Plus, Trash2, Upload, Loader2, CheckCircle2, XCircle, Sparkles, ZoomIn, X, ChevronLeft, ChevronRight, RefreshCw, ShieldCheck, AlertTriangle, Clock3, ThumbsUp, ThumbsDown } from "lucide-react";
import React from "react";
import PortalLayout from "@/components/PortalLayout";
import { parseGbpCsv } from "@/lib/gbpCsv";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────
interface BulkPost {
  id: string;
  title: string;
  body: string;
  territory: string;
  suburb: string;
  scheduledFor: string;
}

type ReviewStatus = "draft" | "in_review" | "approved" | "rejected" | "posted";
interface ImageQA {
  status: "passed" | "failed" | "unavailable";
  qualityScore: number;
  confidence: "high" | "medium" | "low";
  issues: string[];
}

interface GeneratedImage {
  assetId: number | null;
  url: string;
  filename: string;
  serviceLabel: string;
  species: string;
  brandAsset: "official_logo" | "text_fallback";
  prompt: string;
  title: string;
  territory: string;
  suburb: string;
  body: string;
  scheduledFor: string;
  status: ReviewStatus;
  qa: ImageQA;
  generationAttempts: number;
  persisted: boolean;
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

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span
            className="rounded px-2 py-1 font-semibold"
            style={{
              background: img.qa.status === "passed" ? "rgba(105,190,40,0.22)" : "rgba(245,158,11,0.2)",
              color: "white",
            }}
          >
            QA {img.qa.status === "passed" ? `passed · ${img.qa.qualityScore}/10` : img.qa.status}
          </span>
          <span className="rounded px-2 py-1" style={{ background: "rgba(255,255,255,0.1)", color: "white" }}>
            Review: {img.status.replace("_", " ")}
          </span>
          {img.brandAsset === "text_fallback" && (
            <span className="rounded px-2 py-1" style={{ background: "rgba(245,158,11,0.25)", color: "white" }}>
              Logo fallback used
            </span>
          )}
          {img.scheduledFor && (
            <span className="rounded px-2 py-1" style={{ background: "rgba(255,255,255,0.1)", color: "white" }}>
              Scheduled {img.scheduledFor}
            </span>
          )}
        </div>
        {img.qa.issues.length > 0 && (
          <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
            QA notes: {img.qa.issues.join(" · ")}
          </p>
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
  onReview,
  isReviewing,
}: {
  img: GeneratedImage;
  onOpenLightbox: () => void;
  onReview: (status: "in_review" | "approved" | "rejected") => void;
  isReviewing: boolean;
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
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
              <Badge className="text-[10px]" style={{ background: img.qa.status === "passed" ? "#2F7D32" : "#B45309", color: "white" }}>
                {img.qa.status === "passed" ? `QA ${img.qa.qualityScore}/10` : `QA ${img.qa.status}`}
              </Badge>
              <Badge variant="secondary" className="text-[10px] capitalize">{img.status.replace("_", " ")}</Badge>
              {img.brandAsset === "text_fallback" && <Badge className="text-[10px] bg-amber-600 text-white">Logo fallback</Badge>}
            </div>
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.25)" }}
            >
              <ZoomIn size={28} color="white" />
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
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
            {img.scheduledFor && <p className="text-[11px] text-gray-500">Scheduled: {img.scheduledFor}</p>}
            {img.qa.issues.length > 0 && (
              <p className="text-[11px] text-amber-700 line-clamp-2">{img.qa.issues.join(" · ")}</p>
            )}
            {img.assetId ? (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t">
                <Button variant="outline" size="sm" className="h-7 text-[11px]" disabled={isReviewing} onClick={() => onReview("in_review")}>
                  <Clock3 size={11} /> Review
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[11px] text-green-700" disabled={isReviewing || img.qa.status !== "passed" || img.brandAsset !== "official_logo"} onClick={() => onReview("approved")}>
                  <ThumbsUp size={11} /> Approve
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[11px] text-red-700" disabled={isReviewing} onClick={() => onReview("rejected")}>
                  <ThumbsDown size={11} /> Reject
                </Button>
              </div>
            ) : (
              <p className="text-[11px] text-amber-700">Not saved to the review queue because the database is unavailable.</p>
            )}
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
  const [reviewingAssetId, setReviewingAssetId] = useState<number | null>(null);
  const generateSingle = trpc.gbpImage.generateSingle.useMutation();
  const updateReview = trpc.gbpImage.updateAssetReview.useMutation();
  const utils = trpc.useUtils();
  const { user } = useAuth();

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
        scheduledFor: img.scheduledFor || undefined,
        variationKey: crypto.randomUUID(),
      });
      const updated = images.map((item, i) =>
        i === index
          ? { ...item, ...result, success: true, error: undefined }
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

  const handleReview = async (index: number, status: "in_review" | "approved" | "rejected") => {
    const image = images[index];
    if (!image?.assetId) return;
    setReviewingAssetId(image.assetId);
    try {
      await updateReview.mutateAsync({
        id: image.assetId,
        status,
        reviewerName: user?.username || "portal-reviewer",
        scheduledFor: image.scheduledFor || null,
      });
      onImagesChange(images.map((item, itemIndex) => itemIndex === index ? { ...item, status } : item));
      await utils.gbpImage.listAssets.invalidate();
      toast.success(status === "approved" ? "Image approved" : status === "rejected" ? "Image rejected" : "Sent for review");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setReviewingAssetId(null);
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
            onReview={(status) => handleReview(i, status)}
            isReviewing={reviewingAssetId === img.assetId}
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
  const { data: reviewData, isLoading: reviewLoading } = trpc.gbpImage.listAssets.useQuery({ limit: 100 });

  // Single post state
  const [singleTitle, setSingleTitle] = useState("");
  const [singleBody, setSingleBody] = useState("");
  const [singleTerritory, setSingleTerritory] = useState("");
  const [singleSuburb, setSingleSuburb] = useState("");
  const [singleScheduledFor, setSingleScheduledFor] = useState("");
  const [singleResults, setSingleResults] = useState<GeneratedImage[]>([]);

  // Bulk manual state
  const [bulkPosts, setBulkPosts] = useState<BulkPost[]>([
    { id: "1", title: "", body: "", territory: "", suburb: "", scheduledFor: "" },
  ]);
  const [bulkResults, setBulkResults] = useState<GeneratedImage[]>([]);

  // CSV state
  const [csvPosts, setCsvPosts] = useState<BulkPost[]>([]);
  const [csvResults, setCsvResults] = useState<GeneratedImage[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvErrors, setCsvErrors] = useState<Array<{ row: number; message: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Progress state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const generateSingle = trpc.gbpImage.generateSingle.useMutation();
  const generateBulk = trpc.gbpImage.generateBulk.useMutation();
  const trpcUtils = trpc.useUtils();
  const selectedSingleSuburbs = territories.find((territory) => territory.id === singleTerritory)?.suburbs ?? [];
  const reviewImages = useMemo<GeneratedImage[]>(() => (reviewData?.assets ?? []).map((asset: any) => ({
    assetId: asset.id,
    url: asset.imageUrl,
    filename: asset.filename,
    serviceLabel: asset.serviceLabel,
    species: asset.species,
    brandAsset: asset.brandAsset,
    prompt: asset.prompt,
    title: asset.title,
    territory: asset.territoryId,
    suburb: asset.suburb || "",
    body: asset.body || "",
    scheduledFor: asset.scheduledFor || "",
    status: asset.status,
    qa: asset.qa || { status: asset.qaStatus, qualityScore: 0, confidence: "low", issues: ["QA details unavailable"] },
    generationAttempts: asset.generationAttempts,
    persisted: true,
    success: true,
  })), [reviewData]);

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

      if (status.status === "pending" || status.status === "running" || (status.status === "completed" && status.completed < status.total)) {
        // Still running — poll again in 2s
        await new Promise((r) => setTimeout(r, 2000));
        return poll();
      }

      // Done — map results
      const mapped: GeneratedImage[] = status.results.map((r: any, i: number) => ({
        assetId: r.assetId ?? null,
        url: r.url,
        filename: r.filename,
        serviceLabel: r.serviceLabel,
        species: r.species || "",
        brandAsset: r.brandAsset || "text_fallback",
        prompt: r.prompt,
        title: validPosts[r.index]?.title ?? validPosts[i]?.title ?? "",
        territory: validPosts[r.index]?.territory ?? validPosts[i]?.territory ?? "",
        suburb: validPosts[r.index]?.suburb ?? validPosts[i]?.suburb ?? "",
        body: validPosts[r.index]?.body ?? validPosts[i]?.body ?? "",
        scheduledFor: validPosts[r.index]?.scheduledFor ?? validPosts[i]?.scheduledFor ?? "",
        status: r.status || "draft",
        qa: r.qa || { status: "unavailable", qualityScore: 0, confidence: "low", issues: ["QA details unavailable"] },
        generationAttempts: r.generationAttempts || 0,
        persisted: r.persisted === true,
        success: r.success,
        error: r.error,
      }));
      setResults(mapped);
      const successCount = mapped.filter((r) => r.success).length;
      if (status.status === "interrupted") {
        toast.error(`Generation was interrupted after ${status.completed} of ${status.total} posts. Completed images remain in the review queue.`);
      } else if (status.failed > 0) {
        toast.warning(`${successCount} images generated; ${status.failed} failed`);
      } else {
        toast.success(`${successCount} of ${mapped.length} images generated`);
      }
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
        scheduledFor: singleScheduledFor || undefined,
        variationKey: crypto.randomUUID(),
      });
      const newImg: GeneratedImage = {
        ...result,
        title: singleTitle,
        territory: singleTerritory,
        suburb: singleSuburb,
        body: singleBody,
        scheduledFor: singleScheduledFor,
        success: true,
      };
      setSingleResults((prev) => [newImg, ...prev]);
      setProgress({ current: 1, total: 1 });
      toast.success("Image generated!");
    } catch (err) {
      const errImg: GeneratedImage = {
        assetId: null, url: "", filename: "", serviceLabel: "", species: "", brandAsset: "text_fallback", prompt: "",
        title: singleTitle, territory: singleTerritory, suburb: singleSuburb, body: singleBody, scheduledFor: singleScheduledFor,
        status: "draft", qa: { status: "unavailable", qualityScore: 0, confidence: "low", issues: [String(err)] }, generationAttempts: 0, persisted: false,
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
        posts: valid.map((p) => ({ title: p.title, body: p.body, territory: p.territory, suburb: p.suburb, scheduledFor: p.scheduledFor || undefined })),
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
    loadCsvFile(file);
  };

  const loadCsvFile = (file: File) => {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseGbpCsv(String(ev.target?.result || ""), territories);
        setCsvPosts(parsed.posts);
        setCsvErrors(parsed.errors);
        setCsvResults([]);
        if (parsed.posts.length > 0) toast.success(`Loaded ${parsed.posts.length} valid posts from CSV`);
        if (parsed.errors.length > 0) toast.error(`${parsed.errors.length} CSV row issue${parsed.errors.length === 1 ? "" : "s"} must be corrected`);
      } catch (error) {
        setCsvPosts([]);
        setCsvErrors([{ row: 1, message: error instanceof Error ? error.message : String(error) }]);
        toast.error("CSV could not be parsed");
      }
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
        posts: valid.map((p) => ({ title: p.title, body: p.body, territory: p.territory, suburb: p.suburb, scheduledFor: p.scheduledFor || undefined })),
      });
      await pollJobStatus(jobId, valid, setCsvResults);
    } catch (err) {
      toast.error("Generation failed: " + String(err));
      setIsGenerating(false);
    }
  };

  // ── Bulk post row helpers ─────────────────────────────────────────────────
  const addBulkRow = () => {
    setBulkPosts((prev) => [...prev, { id: Date.now().toString(), title: "", body: "", territory: "", suburb: "", scheduledFor: "" }]);
  };
  const removeBulkRow = (id: string) => {
    setBulkPosts((prev) => prev.filter((p) => p.id !== id));
  };
  const updateBulkRow = (id: string, field: keyof BulkPost, value: string) => {
    setBulkPosts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

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
            Generate, quality-check, and approve AI illustrations for Google Business Profile posts.
          </p>
          <div className="mt-3" style={{ borderTop: "2px solid oklch(0.68 0.20 140)", width: "48px" }} />
        </div>

        <div className="mb-6 rounded-lg border p-4 flex items-start gap-3" style={{ background: "#FFF8E7", borderColor: "#E8C66A" }}>
          <ShieldCheck size={18} className="mt-0.5 shrink-0" style={{ color: "#7A5B00" }} />
          <div className="text-sm" style={{ color: "#5C4710" }}>
            <strong>GBP posts only.</strong> These are AI-generated illustrations and require human approval. Never upload them to the consumer-facing GBP photo gallery or describe them as real customer/job photographs.
          </div>
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
            <TabsTrigger value="review">Review Queue</TabsTrigger>
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
                    list="single-gbp-suburbs"
                    className="text-sm"
                  />
                  <datalist id="single-gbp-suburbs">
                    {selectedSingleSuburbs.map((suburb) => <option key={suburb} value={suburb} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "oklch(0.52 0.016 80)" }}>
                    Scheduled date
                  </label>
                  <Input
                    type="date"
                    value={singleScheduledFor}
                    onChange={(e) => setSingleScheduledFor(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
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
                        list={`gbp-suburbs-${post.id}`}
                        className="text-xs h-8"
                      />
                      <datalist id={`gbp-suburbs-${post.id}`}>
                        {(territories.find((territory) => territory.id === post.territory)?.suburbs ?? []).map((suburb) => <option key={suburb} value={suburb} />)}
                      </datalist>
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
                    <div className="col-span-7 col-start-2">
                      <Textarea
                        placeholder="Post body (optional)"
                        value={post.body}
                        onChange={(e) => updateBulkRow(post.id, "body", e.target.value)}
                        className="text-xs min-h-[50px]"
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="date"
                        aria-label="Scheduled date"
                        value={post.scheduledFor}
                        onChange={(e) => updateBulkRow(post.id, "scheduledFor", e.target.value)}
                        className="text-xs h-8"
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
                Upload a CSV with <code className="bg-gray-100 px-1 rounded">post_title</code>, <code className="bg-gray-100 px-1 rounded">territory</code>, and optional <code className="bg-gray-100 px-1 rounded">post_body</code>, <code className="bg-gray-100 px-1 rounded">suburb</code>, and <code className="bg-gray-100 px-1 rounded">scheduled_for</code> (YYYY-MM-DD).
              </p>

              {/* CSV template download */}
              <div className="mb-4 p-3 rounded-md flex items-center justify-between" style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.012 80)" }}>
                <span className="text-xs" style={{ color: "oklch(0.52 0.016 80)" }}>Need a template?</span>
                <a
                  href={`data:text/csv;charset=utf-8,post_title,post_body,territory,suburb,scheduled_for\n"Squirrel found in attic","A homeowner called us after hearing scratching sounds...",milwaukee,Waukesha,2026-09-07\n"Raccoon removal in Hamilton","Spring is peak season for raccoon activity...",hamilton,Ancaster,2026-09-14`}
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
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) loadCsvFile(file);
                }}
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

              {csvErrors.length > 0 && (
                <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-900 mb-1">Rows requiring correction</p>
                  <ul className="text-xs text-amber-800 space-y-1">
                    {csvErrors.slice(0, 12).map((error, index) => <li key={`${error.row}-${index}`}>Row {error.row}: {error.message}</li>)}
                  </ul>
                  {csvErrors.length > 12 && <p className="text-xs text-amber-700 mt-1">+ {csvErrors.length - 12} more</p>}
                </div>
              )}

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
                          <th className="text-left px-3 py-2 font-semibold" style={{ color: "oklch(0.52 0.016 80)" }}>Scheduled</th>
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
                            <td className="px-3 py-2" style={{ color: "oklch(0.52 0.016 80)" }}>{post.scheduledFor || "—"}</td>
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

          {/* ── Review Queue ── */}
          <TabsContent value="review">
            <div className="rounded-lg border p-6" style={{ borderColor: "oklch(0.88 0.012 80)", background: "oklch(1 0 0)" }}>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-base font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}>
                    Human Review Queue
                  </h2>
                  <p className="text-xs mt-1" style={{ color: "oklch(0.52 0.016 80)" }}>
                    Automated QA is a screening step. Rachel, Sarah, Tristan, or another authorized reviewer must still approve every image before use.
                  </p>
                </div>
                {reviewData?.available && (
                  <div className="flex gap-2 text-xs">
                    <Badge variant="secondary">{reviewImages.filter((image) => image.status === "draft").length} draft</Badge>
                    <Badge variant="secondary">{reviewImages.filter((image) => image.status === "in_review").length} reviewing</Badge>
                    <Badge variant="secondary">{reviewImages.filter((image) => image.status === "approved").length} approved</Badge>
                  </div>
                )}
              </div>

              {reviewLoading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading review queue…</div>
              ) : reviewData?.available === false ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  The database is unavailable. Images can still be generated and downloaded, but approval history cannot be saved.
                </div>
              ) : reviewImages.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">No generated images have been saved yet.</div>
              ) : (
                <ImageGallery images={reviewImages} onImagesChange={() => { void trpcUtils.gbpImage.listAssets.invalidate(); }} />
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Info box */}
        <div className="mt-6 p-4 rounded-lg border text-sm" style={{ background: "oklch(0.97 0.012 80)", borderColor: "oklch(0.88 0.012 80)", color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
          <div className="flex items-start gap-2">
            <ImageIcon size={14} className="mt-0.5 shrink-0" style={{ color: "oklch(0.68 0.20 140)" }} />
            <div>
              <strong style={{ color: "oklch(0.68 0.20 140)" }}>How it works:</strong> GPT Image 2 creates a 1536×1024 candidate from the post’s actual species, action, setting, season, territory, and suburb. Vision QA checks species, humane treatment, anatomy, realism, setting, and professional quality; failed candidates are retried up to twice. The returned candidate is resized to 1200×900, receives verified Skedaddle overlay treatment, and enters the human review queue as a draft. Only QA-passed drafts can be approved.
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
