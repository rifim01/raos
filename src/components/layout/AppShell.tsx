"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileNav from "./MobileNav";
import PwaRegister from "@/components/shared/PwaRegister"; // <-- 1. Impor PWA Register pasif di sini

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  userRoleLevel?: number;
  airportId?: string | null;
  airportCode?: string | null;
}

export default function AppShell({
  children,
  userEmail,
  userName,
  userRole,
  userRoleLevel,
  airportId,
  airportCode,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState("ALL");

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "transparent" }}>
      {/* 2. Selipkan Service Worker Activator di baris teratas wrapper */}
      <PwaRegister />

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          userRoleLevel={userRoleLevel}
          airportCode={airportCode}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex-shrink-0">
            <Sidebar
              onClose={() => setSidebarOpen(false)}
              userRoleLevel={userRoleLevel}
              airportCode={airportCode}
            />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuToggle={() => setSidebarOpen(true)}
          userEmail={userEmail}
          userName={userName}
          userRole={userRole}
          selectedAirport={selectedAirport}
          onAirportChange={setSelectedAirport}
        />
        <main className="flex-1 overflow-y-auto pb-28 lg:pb-0" style={{ background: "transparent" }}>
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto animate-fade-in">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
