// Skedaddle Franchise Portal — Resources Page (Admin only)
// Links to templates, documentation, and drive assets

import PortalLayout from "@/components/PortalLayout";
import { ExternalLink, FileText } from "lucide-react";

const RESOURCES = [
  {
    category: "Strategy Dashboards",
    items: [
      { label: "Milwaukee Strategy Dashboard", url: "https://drive.google.com/file/d/1wEL923rGDt4iIDZiR4Ik-OBc9Vd-EO35/view", type: "drive", note: "" },
      { label: "Madison Strategy Dashboard", url: "https://drive.google.com/file/d/1vr_dMB5c5YRCbKVAVk2vB9EsHJxEVbSN/view", type: "drive", note: "" },
    ],
  },
  {
    category: "Data & Scripts",
    items: [
      { label: "SkedaddleDashboardGenerator_v2.zip", url: "https://drive.google.com/drive/folders/1F-kHnF6nhw1tCDBSLEr396WioMHjqxzD", type: "drive", note: "Dashboard generation scripts" },
      { label: "Legacy tool archive", url: "https://drive.google.com/drive/folders/1F-kHnF6nhw1tCDBSLEr396WioMHjqxzD", type: "drive", note: "Archived scripts; use portal Tools for current workflows" },
    ],
  },
];

export default function Resources() {
  return (
    <PortalLayout>
      <div className="px-6 py-8 max-w-3xl">
        <div className="mb-8">
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "oklch(0.75 0.18 140)", fontFamily: "Inter, sans-serif" }}
          >
            Admin Only
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}
          >
            Resources
          </h1>
          <div className="mt-3" style={{ borderTop: "2px solid oklch(0.68 0.20 140)", width: "48px" }} />
        </div>

        {RESOURCES.map((section) => (
          <div key={section.category} className="mb-8">
            <h2
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: "oklch(0.75 0.18 140)", fontFamily: "Inter, sans-serif" }}
            >
              {section.category}
            </h2>
            <div className="space-y-2">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-3 rounded-sm border"
                  style={{ background: "oklch(1 0 0)", borderColor: "oklch(0.88 0.012 80)" }}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={15} style={{ color: "oklch(0.52 0.016 80)", flexShrink: 0 }} />
                    <div>
                      <div className="text-sm font-medium" style={{ color: "oklch(0.18 0.015 65)", fontFamily: "Inter, sans-serif" }}>
                        {item.label}
                      </div>
                      {item.note && (
                        <div className="text-xs" style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}>
                          {item.note}
                        </div>
                      )}
                    </div>
                  </div>
                  {item.url !== "#" && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
                      style={{ color: "oklch(0.68 0.20 140)", fontFamily: "Inter, sans-serif" }}
                    >
                      Open <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PortalLayout>
  );
}
