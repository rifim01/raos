"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface CommandItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  colorClass: string;
  bgIconClass: string;
  description: string;
}

export default function FloatingCommandCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);
  const [alertCount] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 1500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const menuItems: CommandItem[] = [
    {
      id: "ai",
      label: "Rifim AI",
      icon: "🤖",
      path: "/rifim-ai",
      colorClass: "text-[#8B5CF6]",
      bgIconClass: "bg-[#8B5CF6]/10",
      description: "AI Assistant & Knowledge Center",
    },
    {
      id: "tracking",
      label: "Live Tracking",
      icon: "🛰️",
      path: "/live-tracking",
      colorClass: "text-[#22C55E]",
      bgIconClass: "bg-[#22C55E]/10",
      description: "Track Driver & Staff Locations",
    },
    {
      id: "map",
      label: "Peta Bandara",
      icon: "🗺️",
      path: "/peta-bandara",
      colorClass: "text-[#3B82F6]",
      bgIconClass: "bg-[#3B82F6]/10",
      description: "Airport Operational Map",
    },
    {
      id: "hr",
      label: "SDM",
      icon: "👥", // Properti ikon yang sempat tertinggal kini sudah aman terpasang
      path: "/driver",
      colorClass: "text-[#0EA5E9]",
      bgIconClass: "bg-[#0EA5E9]/10",
      description: "Employee Management",
    },
    {
      id: "reports",
      label: "Laporan",
      icon: "📊",
      path: "/laporan",
      colorClass: "text-[#F59E0B]",
      bgIconClass: "bg-[#F59E0B]/10",
      description: "Reports & Analytics",
    },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.03,
        staggerDirection: 1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 22 }
    },
    exit: { opacity: 0, y: 15, scale: 0.95, transition: { duration: 0.15 } }
  };

  const getMobileArcStyle = (index: number, total: number) => {
    const startAngle = 100;
    const endAngle = 170;
    const angleRange = endAngle - startAngle;
    const currentAngle = startAngle + (angleRange / (total - 1)) * index;
    const radius = 105;
    
    const angleRad = (currentAngle * Math.PI) / 180;
    const x = -Math.cos(angleRad) * radius;
    const y = -Math.sin(angleRad) * radius;

    return {
      bottom: `${y + 16}px`,
      right: `${x + 16}px`,
    };
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none">
      {/* DESKTOP VERSION */}
      <div className="hidden md:block mb-4">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="flex flex-col gap-3 items-end w-[220px]"
            >
              {menuItems.map((item) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, x: -4 }}
                  onClick={() => handleNavigation(item.path)}
                  className="flex items-center justify-end w-full group cursor-pointer"
                >
                  <span className="mr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-slate-400 bg-slate-900/80 text-white px-2 py-1 rounded shadow-md pointer-events-none">
                    {item.description}
                  </span>
                  
                  <div className="flex items-center justify-between w-[180px] h-[48px] px-4 bg-white/95 backdrop-blur-md border border-slate-100 rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200 group-hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
                    <span className="text-sm font-semibold text-[#111111]">{item.label}</span>
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-lg ${item.bgIconClass}`}>
                      {item.icon}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MOBILE VERSION */}
      <div className="block md:hidden">
        <AnimatePresence>
          {isOpen && (
            <div className="absolute inset-0 w-0 h-0">
              {menuItems.map((item, index) => {
                const arcCoords = getMobileArcStyle(index, menuItems.length);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      x: parseFloat(arcCoords.right) - 16,
                      y: -(parseFloat(arcCoords.bottom) - 16)
                    }}
                    exit={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => handleNavigation(item.path)}
                    className="absolute w-12 h-12 flex items-center justify-center bg-white border border-slate-100 shadow-lg rounded-full touch-none cursor-pointer"
                    style={{ bottom: 0, right: 0 }}
                  >
                    <span className="text-xl">{item.icon}</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB ACTION BUTTON */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: isOpen 
            ? "0 0 25px rgba(255,214,0,0.5)" 
            : "0 12px 40px rgba(255,214,0,0.35)"
        }}
        className={`relative flex items-center justify-center rounded-full transition-colors duration-300 outline-none select-none
          w-[64px] h-[64px] md:w-[72px] md:h-[72px]
          ${isOpen ? "bg-[#111111]" : "bg-[#FFD600]"}
        `}
      >
        {pulseActive && !isOpen && (
          <span className="absolute inset-0 rounded-full bg-[#FFD600] opacity-40 animate-ping" />
        )}

        {alertCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-bold text-white shadow-md border-2 border-white animate-bounce">
            {alertCount}
          </span>
        )}

        <span className={`text-2xl md:text-3xl transition-transform duration-300 ${isOpen ? "rotate-45 text-white" : "rotate-0 text-[#111111]"}`}>
          {isOpen ? "✕" : "🎛️"}
        </span>
      </motion.button>
    </div>
  );
}
