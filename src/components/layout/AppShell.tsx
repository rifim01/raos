"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileNav from "./MobileNav";

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  userRole?: string;
}

export default function AppShell({ children, userEmail, userName, userRole }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState("ALL");

  return (
    <div className="flex h-full overflow-hidden bg-[#F5F7FA]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50 flex-shrink-0">
            <Sidebar onClose={() => setSidebarOpen(false)} />
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
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto animate-slide-up">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
