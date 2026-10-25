"use client";

import React from "react";
import { motion } from "framer-motion";
import { useFinanceStore, ActiveTab } from "@/store/useFinanceStore";
import {
  Sparkles,
  ShoppingBag,
  CookingPot,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const APPLE_SPRING = {
  type: "spring" as const,
  stiffness: 440,
  damping: 26,
  mass: 0.75,
};

export function BottomTabBar() {
  const { activeTab, setActiveTab, setQuickAddOpen, groceryItems } =
    useFinanceStore();

  const uncheckedCount = groceryItems.filter((i) => !i.checked).length;

  const leftTabs: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: "stocks",
      label: "Kora IA",
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: "groceries",
      label: "Courses",
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: uncheckedCount > 0 ? uncheckedCount : undefined,
    },
  ];

  const rightTabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "batch",
      label: "Frigo",
      icon: <CookingPot className="w-4 h-4" />,
    },
    {
      id: "analytics",
      label: "Analyses",
      icon: <SlidersHorizontal className="w-4 h-4" />,
    },
  ];

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 px-4 pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <nav
        aria-label="Navigation principale"
        className="pointer-events-auto max-w-md mx-auto h-16 px-2.5 rounded-full apple-titanium-card grid grid-cols-5 items-center shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
      >
        {leftTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              transition={APPLE_SPRING}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-full transition-colors",
                isActive
                  ? "text-[#0071E3]"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="bottomTabActiveGlow"
                  transition={APPLE_SPRING}
                  className="absolute inset-x-2 inset-y-1 rounded-full bg-[#0071E3]/10 -z-10"
                />
              )}
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-2.5 min-w-[15px] h-3.5 px-1 rounded-full bg-[#0071E3] text-white text-[9px] font-bold flex items-center justify-center tabular-nums shadow-xs"
                  >
                    {tab.badge}
                  </motion.span>
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-tight">
                {tab.label}
              </span>
            </motion.button>
          );
        })}

        {/* Central Floating Action Sphere (+) */}
        <div className="flex items-center justify-center">
          <motion.button
            whileHover={{ scale: 1.08, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={APPLE_SPRING}
            onClick={() => setQuickAddOpen(true)}
            aria-label="Ajout rapide"
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#0F172A] via-[#1E293B] to-[#0071E3] text-white shadow-lg shadow-[#0071E3]/25 border border-white/50 flex items-center justify-center"
          >
            <Plus className="w-5 h-5 stroke-[2.4]" />
          </motion.button>
        </div>

        {rightTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              transition={APPLE_SPRING}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-full transition-colors",
                isActive
                  ? "text-[#0071E3]"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="bottomTabActiveGlow"
                  transition={APPLE_SPRING}
                  className="absolute inset-x-2 inset-y-1 rounded-full bg-[#0071E3]/10 -z-10"
                />
              )}
              {tab.icon}
              <span className="text-[10px] font-semibold tracking-tight">
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
