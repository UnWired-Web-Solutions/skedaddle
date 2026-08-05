// Skedaddle Franchise Portal — Persistent Sidebar Layout
// Field Operations Manual aesthetic: deep forest green sidebar, parchment content area

import { useAuth } from "@/contexts/AuthContext";
import { FRANCHISE_LOCATIONS } from "@/data/franchises";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  Cloud,
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
  { label: "Network Map", href: "/network", icon: <MapPin size={16} /> },
  { label: "Tools", href: "/tools", icon: <BarChart3 size={16} /> },
  { label: "GBP Images", href: "/gbp-images", icon: <ImageIcon size={16} /> },
  { label: "Analytics", href: "/analytics", icon: <LineChart size={16} /> },
  { label: "Resources", href: "/resources", icon: <BookOpen size={16} />, adminOnly: true },
  { label: "Proposals", href: "/proposals", icon: <FileText size={16} />, adminOnly: true },
  { label: "Salesforce", href: "/salesforce", icon: <Cloud size={16} />, adminOnly: true },
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
        className="px-4 py-4 border-b flex flex-col items-center"
        style={{ borderColor: "oklch(0.28 0.09 145)", background: "oklch(0.18 0.07 145)" }}
      >
        <img
          src="/manus-storage/skedaddle_logo_white_rgba_ef9c6122.png"
          alt="Skedaddle Humane Wildlife Control"
          className="w-32 h-auto mb-2"
        />
        <div
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: "oklch(0.55 0.08 145)", fontFamily: "Inter, sans-serif" }}
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
              background: isActive(item.href) ? "oklch(0.28 0.09 145)" : "transparent",
              color: isActive(item.href) ? "oklch(0.97 0.012 80)" : "oklch(0.75 0.06 80)",
            }}
          >
            <span style={{ color: isActive(item.href) ? "oklch(0.72 0.10 145)" : "oklch(0.55 0.06 80)" }}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Divider */}
      <div
        className="mx-3 my-2"
        style={{ borderTop: "1px solid oklch(0.28 0.09 145)" }}
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
                background: active ? "oklch(0.28 0.09 145)" : "transparent",
                color: active ? "oklch(0.97 0.012 80)" : "oklch(0.72 0.06 80)",
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} style={{ flexShrink: 0, color: active ? "oklch(0.72 0.10 145)" : "oklch(0.50 0.06 80)" }} />
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
                style={{ color: "oklch(0.55 0.06 80)" }}
              />
            </Link>
          );
        })}
      </div>

      {/* User footer */}
      <div
        className="px-5 py-4 border-t"
        style={{ borderColor: "oklch(0.28 0.09 145)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-xs font-semibold"
              style={{ color: "oklch(0.85 0.005 80)", fontFamily: "Inter, sans-serif" }}
            >
              {user?.username}
            </div>
            <div
              className="text-xs"
              style={{ color: "oklch(0.55 0.06 80)", fontFamily: "Inter, sans-serif" }}
            >
              {user?.role === "admin" ? "Administrator" : "Franchise Owner"}
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-sm transition-colors hover:bg-[oklch(0.28_0.09_145)]"
            title="Sign out"
          >
            <LogOut size={15} style={{ color: "oklch(0.55 0.06 80)" }} />
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
        style={{ background: "oklch(0.22 0.09 145)" }}
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
            style={{ background: "oklch(0.22 0.09 145)" }}
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
          style={{ background: "oklch(0.22 0.09 145)", borderColor: "oklch(0.28 0.09 145)" }}
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
