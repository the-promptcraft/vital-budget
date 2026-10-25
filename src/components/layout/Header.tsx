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
    <header className="sticky top-0 z-30 backdrop-blur-2xl bg-white/70 border-b border-white/80 shadow-[0_1px_12px_rgba(15,23,42,0.03)] px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("stocks")}
          className="flex items-center gap-2.5 text-left group"
        >
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-[#0071E3] to-[#42A1EC] text-white flex items-center justify-center font-semibold text-xs shadow-sm shadow-[#0071E3]/25 group-hover:scale-105 transition-transform">
            V
          </div>
          <div>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-[#1D1D1F] block leading-tight">
              VitalBudget
            </span>
            <span className="text-[11px] text-[#6E6E73] font-medium block">
              {currentMonthLabel}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("batch")}
          className="apple-glass-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-[#1D1D1F] hover:bg-white/95 transition-colors"
          title="Portions prêtes au frigo"
        >
          <Utensils className="w-3.5 h-3.5 text-[#0071E3]" />
          <span className="tabular-nums font-semibold text-[#1D1D1F]">
            {totalFridgePortions}
          </span>
          <span className="text-[11px] text-[#6E6E73]">portions frigo</span>
        </button>
      </div>
    </header>
  );
}
