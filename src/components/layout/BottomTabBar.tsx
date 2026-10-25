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
      label: "Assistant",
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
      label: "Réglages",
      icon: <SlidersHorizontal className="w-4 h-4" />,
    },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 z-40 backdrop-blur-2xl bg-[#09090B]/85 border-t border-white/[0.07] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-lg mx-auto px-3 h-16 grid grid-cols-5 items-center">
        {leftTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.92 }}
              transition={APPLE_SPRING}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 py-1.5 transition-colors",
                isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="bottomTabActiveGlow"
                  transition={APPLE_SPRING}
                  className="absolute inset-x-3 inset-y-1 rounded-xl bg-white/[0.07] -z-10"
                />
              )}
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-3.5 px-1 rounded-full bg-white text-black text-[9px] font-bold flex items-center justify-center tabular-nums">
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

        {/* Central Minimalist Vercel Action Button (+) */}
        <div className="flex items-center justify-center">
          <motion.button
            whileTap={{ scale: 0.91 }}
            whileHover={{ scale: 1.03 }}
            transition={APPLE_SPRING}
            onClick={() => setQuickAddOpen(true)}
            aria-label="Ajout rapide"
            className="w-10 h-10 rounded-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center justify-center"
          >
            <Plus className="w-5 h-5 stroke-[2.2]" />
          </motion.button>
        </div>

        {rightTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.92 }}
              transition={APPLE_SPRING}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 py-1.5 transition-colors",
                isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="bottomTabActiveGlow"
                  transition={APPLE_SPRING}
                  className="absolute inset-x-3 inset-y-1 rounded-xl bg-white/[0.07] -z-10"
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
