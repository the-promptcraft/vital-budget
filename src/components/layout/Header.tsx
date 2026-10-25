"use client";

import React from "react";
import { motion } from "framer-motion";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Utensils } from "lucide-react";

export function Header() {
  const { batchMeals, currentMonthLabel, setActiveTab } = useFinanceStore();

  const totalFridgePortions = batchMeals.reduce(
    (sum, m) => sum + m.remainingPortions,
    0
  );

  return (
    <header className="sticky top-0 z-30 backdrop-blur-2xl bg-white/75 border-b border-white/90 shadow-[0_2px_20px_rgba(15,23,42,0.035)] px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("stocks")}
          className="flex items-center gap-3 text-left group"
        >
          {/* Bespoke Kora Geometric Prism Mark */}
          <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0071E3] p-[1px] shadow-md shadow-[#0071E3]/15 group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-[15px] bg-gradient-to-br from-[#0F172A] to-[#1E293B] flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="10"
                  cy="12"
                  r="5.5"
                  stroke="url(#kora-grad-1)"
                  strokeWidth="2.2"
                />
                <circle
                  cx="14.5"
                  cy="12"
                  r="5.5"
                  stroke="url(#kora-grad-2)"
                  strokeWidth="2.2"
                />
                <defs>
                  <linearGradient
                    id="kora-grad-1"
                    x1="4.5"
                    y1="6.5"
                    x2="15.5"
                    y2="17.5"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#60A5FA" />
                    <stop offset="1" stopColor="#A855F7" />
                  </linearGradient>
                  <linearGradient
                    id="kora-grad-2"
                    x1="9"
                    y1="6.5"
                    x2="20"
                    y2="17.5"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#34D399" />
                    <stop offset="1" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-[-0.03em] text-[#0F172A] leading-none">
                Kora
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#0F172A]/[0.06] text-[9px] font-bold uppercase tracking-widest text-[#475569]">
                AI OS
              </span>
            </div>
            <span className="text-[11px] text-[#64748B] font-medium block mt-0.5">
              {currentMonthLabel} • Wealth &amp; Nutrition
            </span>
          </div>
        </button>

        <motion.button
          whileTap={{ scale: 0.94 }}
          type="button"
          onClick={() => setActiveTab("batch")}
          className="apple-glass-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-[#0F172A] hover:bg-white transition-colors"
          title="Boîtes prêtes au frigo"
        >
          <Utensils className="w-3.5 h-3.5 text-emerald-600" />
          <span className="tabular-nums font-bold text-[#0F172A]">
            {totalFridgePortions}
          </span>
          <span className="text-[11px] text-[#64748B] font-medium">
            boîtes frigo
          </span>
        </motion.button>
      </div>
    </header>
  );
}
