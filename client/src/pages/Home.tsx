// Skedaddle Franchise Portal — source-aware territory overview

import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { FRANCHISE_LOCATIONS, type FranchiseLocation } from "@/data/franchises";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

function LocationCard({ loc }: { loc: FranchiseLocation }) {
  return (
    <div
      className="rounded-sm border transition-shadow hover:shadow-md"
      style={{
        background: "oklch(1 0 0)",
        borderColor: "oklch(0.88 0.012 80)",
        borderLeft: "3px solid oklch(0.68 0.20 140)",
      }}
    >
      <div className="px-5 pt-5 pb-4">
        <div className="min-w-0">
          <h3
            className="text-base font-bold truncate"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}
          >
            {loc.name}
          </h3>
          <div
            className="text-xs mt-0.5"
            style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
          >
            {loc.city}, {loc.state} · {loc.country} · {loc.region}
          </div>
        </div>

        <div
          className="mt-4 rounded-sm px-3 py-2.5 text-xs leading-relaxed"
          style={{ background: "oklch(0.975 0.008 90)", color: "oklch(0.42 0.014 75)", fontFamily: "Inter, sans-serif" }}
        >
          <span className="font-semibold" style={{ color: "oklch(0.28 0.09 145)" }}>Territory profile</span>
          <br />
          Open the dashboard to review available operational, Google Analytics, and Search Console data with its current source and coverage status.
        </div>
      </div>

      <div
        className="px-5 py-3 flex items-center justify-between border-t"
        style={{ borderColor: "oklch(0.93 0.008 80)" }}
      >
        <Link
          href={`/dashboard/${loc.id}`}
          className="text-xs font-semibold flex items-center gap-1 transition-colors"
          style={{ color: "oklch(0.42 0.13 140)", fontFamily: "Inter, sans-serif" }}
        >
          Open Dashboard <ArrowUpRight size={12} />
        </Link>

        <Link
          href={`/location/${loc.id}`}
          className="text-xs flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
        >
          Territory Details <ArrowUpRight size={11} />
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const visibleLocations = user?.role === "admin"
    ? FRANCHISE_LOCATIONS
    : FRANCHISE_LOCATIONS.filter((location) => location.id === user?.locationId);

  return (
    <PortalLayout>
      <div className="px-6 py-8 max-w-6xl">
        <div className="mb-8">
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "oklch(0.42 0.13 140)", fontFamily: "Inter, sans-serif" }}
          >
            {user?.role === "admin" ? "Network Overview" : "Your Territory"}
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}
          >
            {user?.role === "admin" ? "Franchise Locations" : `${user?.locationId?.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())} Dashboard`}
          </h1>
          <div
            className="text-sm"
            style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
          >
            {visibleLocations.length} mapped {visibleLocations.length === 1 ? "territory" : "territories"}. Metrics are shown only in their source-aware territory views.
          </div>
          <div className="mt-3" style={{ borderTop: "2px solid oklch(0.68 0.20 140)", width: "48px" }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleLocations.map((location) => (
            <LocationCard key={location.id} loc={location} />
          ))}
        </div>

        {user?.role === "admin" && (
          <div
            className="mt-8 p-4 rounded-sm border text-sm"
            style={{
              background: "oklch(0.97 0.012 80)",
              borderColor: "oklch(0.88 0.012 80)",
              color: "oklch(0.52 0.016 80)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <strong style={{ color: "oklch(0.42 0.13 140)" }}>Source note:</strong> Operational figures use the active Google Drive workbook where an accepted aggregate exists. Google Analytics and Search Console coverage varies by territory and reporting period. Unavailable coverage is not shown as zero.
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
