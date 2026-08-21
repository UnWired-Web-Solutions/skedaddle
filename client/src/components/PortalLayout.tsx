// Skedaddle Franchise Portal — Persistent Sidebar Layout
// Skedaddle portal: charcoal navigation, warm editorial workspace, green action accent

import { useAuth } from "@/contexts/AuthContext";
import { FRANCHISE_LOCATIONS } from "@/data/franchises";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  Cloud,
  FileBarChart,
  FileText,
  ImageIcon,
  LayoutDashboard,
  LineChart,
  LogOut,
  MapPin,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const TOP_NAV: NavItem[] = [
  { label: "Overview", href: "/", icon: <LayoutDashboard size={16} /> },
  { label: "Network", href: "/network", icon: <MapPin size={16} /> },
  { label: "Tools", href: "/tools", icon: <BarChart3 size={16} /> },
  { label: "GBP Images", href: "/gbp-images", icon: <ImageIcon size={16} /> },
  { label: "Analytics", href: "/analytics", icon: <LineChart size={16} /> },
  { label: "Resources", href: "/resources", icon: <BookOpen size={16} />, adminOnly: true },
  { label: "Proposals", href: "/proposals", icon: <FileText size={16} />, adminOnly: true },
  { label: "Sales Strategy Report", href: "/strategy-report", icon: <FileBarChart size={16} />, adminOnly: true },
  { label: "Suburb Pages", href: "/suburb-pages", icon: <MapPin size={16} />, adminOnly: true },
  { label: "Salesforce Setup", href: "/salesforce", icon: <Cloud size={16} />, adminOnly: true },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Filter locations based on user role
  const visibleLocations =
    user?.role === "admin"
      ? FRANCHISE_LOCATIONS
      : FRANCHISE_LOCATIONS.filter((f) => f.id === user?.locationId);

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <div
        className="px-4 py-5 border-b flex flex-col items-center"
        style={{ borderColor: "#4F556B", background: "#F6F3EC" }}
      >
        <img
          src="/manus-storage/skedaddle_logo_rgba_9fad4199.png"
          alt="Skedaddle Humane Wildlife Control"
          className="w-28 h-auto mb-2"
          style={{ mixBlendMode: "multiply" }}
        />
        <div
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: "#34394D", fontFamily: "Inter, sans-serif" }}
        >
          Franchise Portal
        </div>
      </div>

      {/* Top navigation */}
      <nav className="px-3 pt-4 pb-2">
        {TOP_NAV.filter((item) => !item.adminOnly || user?.role === "admin").map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm mb-0.5 transition-colors"
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: isActive(item.href) ? 600 : 400,
              background: isActive(item.href) ? "#4A5064" : "transparent",
              color: isActive(item.href) ? "#FFFFFF" : "#E9EAEF",
              borderLeft: isActive(item.href) ? "3px solid #69BE28" : "3px solid transparent",
            }}
          >
            <span style={{ color: isActive(item.href) ? "#9BD46B" : "#B6BAC7" }}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Divider */}
      <div
        className="mx-3 my-2"
        style={{ borderTop: "1px solid #4F556B" }}
      />

      {/* Locations list */}
      <div className="px-3 flex-1 overflow-y-auto">
        <div
          className="text-xs font-semibold tracking-widest uppercase px-3 mb-2"
          style={{ color: "oklch(0.50 0.06 80)", fontFamily: "Inter, sans-serif" }}
        >
          Locations
        </div>
        {visibleLocations.map((loc) => {
          const href = `/location/${loc.id}`;
          const active = location === href;
          return (
            <Link
              key={loc.id}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-sm text-sm mb-0.5 transition-colors group"
              style={{
                fontFamily: "Inter, sans-serif",
                background: active ? "#4A5064" : "transparent",
                color: active ? "#FFFFFF" : "#E9EAEF",
                borderLeft: active ? "3px solid #69BE28" : "3px solid transparent",
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} style={{ flexShrink: 0, color: active ? "#9BD46B" : "#A6AAB7" }} />
                <span className="truncate">{loc.city}</span>
                {loc.status === "coming_soon" && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-sm flex-shrink-0"
                    style={{ background: "oklch(0.35 0.09 145)", color: "oklch(0.72 0.08 80)", fontSize: "10px" }}
                  >
                    Soon
                  </span>
                )}
              </div>
              <ChevronRight
                size={12}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                style={{ color: "#B6BAC7" }}
              />
            </Link>
          );
        })}
      </div>

      {/* User footer */}
      <div
        className="px-5 py-4 border-t"
        style={{ borderColor: "#4F556B" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-xs font-semibold"
              style={{ color: "#FFFFFF", fontFamily: "Inter, sans-serif" }}
            >
              {user?.username}
            </div>
            <div
              className="text-xs"
              style={{ color: "#B6BAC7", fontFamily: "Inter, sans-serif" }}
            >
              {user?.role === "admin" ? "Administrator" : "Franchise Owner"}
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-sm transition-colors hover:bg-[oklch(0.28_0.10_140)]"
            title="Sign out"
          >
            <LogOut size={15} style={{ color: "#B6BAC7" }} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "oklch(0.97 0.012 80)" }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-56 flex-shrink-0 h-full"
        style={{ background: "#34394D" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0"
            style={{ background: "oklch(0 0 0 / 0.5)" }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative w-64 h-full flex flex-col"
            style={{ background: "#34394D" }}
          >
            <button
              className="absolute top-4 right-4"
              onClick={() => setMobileOpen(false)}
              style={{ color: "oklch(0.65 0.06 80)" }}
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div
          className="lg:hidden flex items-center gap-3 px-4 py-3 border-b"
          style={{ background: "#34394D", borderColor: "#4F556B" }}
        >
          <button onClick={() => setMobileOpen(true)}>
            <Menu size={20} style={{ color: "oklch(0.85 0.005 80)" }} />
          </button>
          <span
            className="text-sm font-semibold"
            style={{ color: "oklch(0.97 0.012 80)", fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Franchise Portal
          </span>
        </div>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
