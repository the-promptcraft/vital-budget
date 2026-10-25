"use client";

import React from "react";
import { motion } from "framer-motion";
import { useFinanceStore, ActiveTab } from "@/store/useFinanceStore";
import {
  TrendingUp,
  ShoppingBag,
  CookingPot,
  BarChart3,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const APPLE_SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 28,
  mass: 0.8,
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
      label: "Budget",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: "groceries",
      label: "Courses",
      icon: <ShoppingBag className="w-5 h-5" />,
      badge: uncheckedCount > 0 ? uncheckedCount : undefined,
    },
  ];

  const rightTabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "batch",
      label: "Frigo & Batch",
      icon: <CookingPot className="w-5 h-5" />,
    },
    {
      id: "analytics",
      label: "Analyses",
      icon: <BarChart3 className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-40 backdrop-blur-2xl bg-[#1C1C1E]/85 border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-lg mx-auto px-3 h-16 grid grid-cols-5 items-center">
        {leftTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.91 }}
              transition={APPLE_SPRING}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 py-1.5 transition-colors",
                isActive ? "text-[#0A84FF]" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="bottomTabActiveGlow"
                  transition={APPLE_SPRING}
                  className="absolute inset-x-3 inset-y-1 rounded-2xl bg-[#0A84FF]/12 -z-10"
                />
              )}
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#30D158] text-[#121214] text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight">
                {tab.label}
              </span>
            </motion.button>
          );
        })}

        {/* Central Action Button (+) */}
        <div className="flex items-center justify-center">
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.03 }}
            transition={APPLE_SPRING}
            onClick={() => setQuickAddOpen(true)}
            aria-label="Quick Add"
            className="w-12 h-12 -mt-4 rounded-2xl bg-gradient-to-tr from-[#0A84FF] to-[#30D158] text-white shadow-lg shadow-[#0A84FF]/30 border border-white/20 flex items-center justify-center"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </motion.button>
        </div>

        {rightTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.91 }}
              transition={APPLE_SPRING}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 py-1.5 transition-colors",
                isActive ? "text-[#0A84FF]" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="bottomTabActiveGlow"
                  transition={APPLE_SPRING}
                  className="absolute inset-x-3 inset-y-1 rounded-2xl bg-[#0A84FF]/12 -z-10"
                />
              )}
              {tab.icon}
              <span className="text-[10px] font-medium tracking-tight">
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
