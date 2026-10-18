"use client";

import React from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Activity, Cloud, HardDrive, Refrigerator } from "lucide-react";

export function Header() {
  const {
    batchMeals,
    groceryItems,
    currentMonthLabel,
    supabaseStatus,
    setActiveTab,
  } = useFinanceStore();

  const totalFridgePortions = batchMeals.reduce(
    (sum, m) => sum + m.remainingPortions,
    0
  );

  const healthyItems = groceryItems.filter(
    (i) => i.family !== "Extras / Ultra-Processed"
  ).length;
  const nutriRatio =
    groceryItems.length > 0
      ? Math.round((healthyItems / groceryItems.length) * 100)
      : 92;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#121214]/85 border-b border-white/[0.08] px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
        {/* Brand & Market Ticker */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0A84FF] via-[#30D158]/80 to-[#64D2FF] p-[1px] shadow-md shadow-[#0A84FF]/20">
            <div className="w-full h-full rounded-[11px] bg-[#121214] flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 17L9 11L13 15L21 7"
                  stroke="url(#vb-grad)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 7H21V12"
                  stroke="#30D158"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient
                    id="vb-grad"
                    x1="3"
                    y1="17"
                    x2="21"
                    y2="7"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#0A84FF" />
                    <stop offset="0.5" stopColor="#64D2FF" />
                    <stop offset="1" stopColor="#30D158" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-[15px] font-semibold tracking-tight text-white">
                VitalBudget
              </h1>
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 tabular-nums">
                {currentMonthLabel}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
              <span>FIN-NUTRI INDEX</span>
              <span className="text-zinc-600">•</span>
              <span className="text-[#64D2FF] font-medium">
                Score {nutriRatio}/100
              </span>
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("batch")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#1C1C1E] border border-white/[0.08] text-xs text-zinc-200 hover:bg-[#2C2C2E] transition"
            title="Meals ready in fridge"
          >
            <Refrigerator className="w-3.5 h-3.5 text-[#64D2FF]" />
            <span className="tabular-nums font-medium">{totalFridgePortions}</span>
            <span className="text-[10px] text-zinc-400 hidden sm:inline">
              meals
            </span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#1C1C1E] border border-white/[0.08] text-[11px] text-zinc-300 hover:bg-[#2C2C2E] transition"
            title="Storage status"
          >
            {supabaseStatus === "connected" ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-[#30D158]" />
                <span className="text-[#30D158] font-medium">Cloud</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-[#0A84FF]" />
                <span className="text-zinc-300">Local</span>
              </>
            )}
            <Activity className="w-3 h-3 text-zinc-500 ml-0.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
