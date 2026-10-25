"use client";

import React from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Utensils } from "lucide-react";

export function Header() {
  const { batchMeals, currentMonthLabel, setActiveTab } = useFinanceStore();

  const totalFridgePortions = batchMeals.reduce(
    (sum, m) => sum + m.remainingPortions,
    0
  );

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#09090B]/80 border-b border-white/[0.06] px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        {/* Minimalist Vercel-style Brand */}
        <button
          type="button"
          onClick={() => setActiveTab("stocks")}
          className="flex items-center gap-2.5 text-left group"
        >
          <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold text-xs tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
            ▲
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-[-0.02em] text-white">
              VitalBudget
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-xs text-zinc-400 font-medium">
              {currentMonthLabel}
            </span>
          </div>
        </button>

        {/* Subtle Fridge Portions Pill */}
        <button
          type="button"
          onClick={() => setActiveTab("batch")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-zinc-300 transition-colors"
          title="Portions prêtes au frigo"
        >
          <Utensils className="w-3.5 h-3.5 text-zinc-400" />
          <span className="tabular-nums font-medium text-white">
            {totalFridgePortions}
          </span>
          <span className="text-[11px] text-zinc-400">portions frigo</span>
        </button>
      </div>
    </header>
  );
}
