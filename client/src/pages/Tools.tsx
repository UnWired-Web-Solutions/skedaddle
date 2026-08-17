import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, FileBarChart, FileText, ImageIcon, LineChart, MapPin, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

const TOOLS = [
  { name: "Territory Dashboards", description: "Review verified T12 demand, species, suburbs, and available search/GBP snapshots.", href: "/", icon: MapPin, adminOnly: false },
  { name: "Analytics", description: "Compare species and location-page sessions plus GBP interactions using the latest imported period.", href: "/analytics", icon: LineChart, adminOnly: false },
  { name: "GBP Images", description: "Generate branded illustrative images for individual or bulk GBP posts.", href: "/gbp-images", icon: ImageIcon, adminOnly: false },
  { name: "Proposal Generator", description: "Confirm commercial terms, review one proposal draft, and export that exact draft.", href: "/proposals", icon: FileText, adminOnly: true },
  { name: "Strategy Reports", description: "Build a territory strategy from sourced data and explicitly confirmed campaign scope.", href: "/strategy-report", icon: FileBarChart, adminOnly: true },
  { name: "Suburb Pages", description: "Generate review-ready local pages after required business facts are supplied.", href: "/suburb-pages", icon: BarChart3, adminOnly: true },
];

export default function Tools() {
  const { user } = useAuth();
  const visibleTools = TOOLS.filter(tool => !tool.adminOnly || user?.role === "admin");

  return (
    <PortalLayout>
      <div className="px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "oklch(0.75 0.18 140)", fontFamily: "Inter, sans-serif" }}>
            Operational Workspace
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}>
            Tools
          </h1>
          <p className="text-sm" style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
            Working portal features only. Availability follows your account role.
          </p>
          <div className="mt-3" style={{ borderTop: "2px solid oklch(0.68 0.20 140)", width: "48px" }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleTools.map(tool => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-sm border p-5 transition-opacity hover:opacity-80"
              style={{ background: "white", borderColor: "oklch(0.88 0.012 80)", borderLeft: "3px solid oklch(0.68 0.20 140)" }}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: "oklch(0.92 0.06 145)", color: "oklch(0.28 0.09 145)" }}>
                  <tool.icon size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "oklch(0.18 0.015 65)" }}>
                    {tool.name} <ArrowUpRight size={12} />
                  </h2>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "oklch(0.52 0.016 80)" }}>{tool.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}
