"use client";

import React, { useState, useMemo } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatEUR } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  SlidersHorizontal,
  Sparkles,
  RotateCcw,
  Pencil,
} from "lucide-react";

type TimeRange = "7D" | "1M" | "3M" | "ALL";

const MONTHS_OPTIONS = [
  "October 2026",
  "November 2026",
  "December 2026",
  "January 2027",
  "February 2027",
  "March 2027",
];

function formatDateLabel(dStr: string) {
  if (!dStr) return "";
  try {
    const parts = dStr.split("-");
    if (parts.length === 3) {
      const d = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
      );
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  } catch {}
  return dStr;
}

export function StocksDashboard() {
  const {
    currentMonthLabel,
    monthlyIncome,
    savingsTarget,
    envelopes,
    fixedExpenses,
    transactions,
    toggleFixedExpensePaid,
    addFixedExpense,
    deleteFixedExpense,
    updateEnvelopeAllocation,
    updateEnvelopeSpent,
    deleteTransaction,
    updateBudgetTargets,
    startNewMonth,
    clearAllDemoData,
    setQuickAddOpen,
  } = useFinanceStore();

  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [editingTargets, setEditingTargets] = useState(false);
  const [incomeInput, setIncomeInput] = useState(String(monthlyIncome));
  const [savingsInput, setSavingsInput] = useState(String(savingsTarget));
  const [selectedNextMonth, setSelectedNextMonth] = useState("November 2026");
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  // Envelope allocation & spent editing
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
  const [envAllocInput, setEnvAllocInput] = useState("");
  const [envSpentInput, setEnvSpentInput] = useState("");

  // Add new fixed bill state
  const [showAddFixed, setShowAddFixed] = useState(false);
  const [fixName, setFixName] = useState("");
  const [fixTicker, setFixTicker] = useState("BILL.FX");
  const [fixAmount, setFixAmount] = useState("");
  const [fixDay, setFixDay] = useState("5");

  const showBanner = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(null), 4500);
  };

  const totalFixed = useMemo(
    () => fixedExpenses.reduce((sum, f) => sum + f.amount, 0),
    [fixedExpenses]
  );

  const totalVariableSpent = useMemo(
    () => envelopes.reduce((sum, e) => sum + e.spent, 0),
    [envelopes]
  );

  // Real Disposable Income (Reste à vivre)
  const disposableBeforeVariable = monthlyIncome - totalFixed - savingsTarget;
  const disposableLeft = Number(
    (disposableBeforeVariable - totalVariableSpent).toFixed(2)
  );

  const todayDay = 18;
  const daysInMonth = 31;
  const remainingDays = Math.max(1, daysInMonth - todayDay);
  const dailyBudgetAllowed = Number(
    (disposableLeft / remainingDays).toFixed(2)
  );

  // Burn Rate vs Ideal Trajectory
  const idealSpentAtToday = Number(
    ((disposableBeforeVariable / daysInMonth) * todayDay).toFixed(2)
  );
  const burnDelta = Number((idealSpentAtToday - totalVariableSpent).toFixed(2));
  const isBullish = burnDelta >= 0;

  const chartData = useMemo(() => {
    const baseCap = Math.max(400, disposableBeforeVariable);
    if (timeRange === "7D") {
      return [
        {
          label: "D-6",
          actual: Math.round(disposableLeft + 165),
          ideal: Math.round(disposableLeft + 140),
        },
        {
          label: "D-5",
          actual: Math.round(disposableLeft + 142),
          ideal: Math.round(disposableLeft + 115),
        },
        {
          label: "D-4",
          actual: Math.round(disposableLeft + 118),
          ideal: Math.round(disposableLeft + 92),
        },
        {
          label: "D-3",
          actual: Math.round(disposableLeft + 88),
          ideal: Math.round(disposableLeft + 70),
        },
        {
          label: "D-2",
          actual: Math.round(disposableLeft + 64),
          ideal: Math.round(disposableLeft + 46),
        },
        {
          label: "Yest.",
          actual: Math.round(disposableLeft + 25),
          ideal: Math.round(disposableLeft + 23),
        },
        {
          label: "Today",
          actual: Math.round(disposableLeft),
          ideal: Math.round(baseCap - idealSpentAtToday),
        },
      ];
    }
    if (timeRange === "1M") {
      return [
        {
          label: "Day 1",
          actual: Math.round(baseCap),
          ideal: Math.round(baseCap),
        },
        {
          label: "Day 5",
          actual: Math.round(baseCap * 0.89),
          ideal: Math.round(baseCap * 0.84),
        },
        {
          label: "Day 10",
          actual: Math.round(baseCap * 0.76),
          ideal: Math.round(baseCap * 0.68),
        },
        {
          label: "Day 14",
          actual: Math.round(baseCap * 0.61),
          ideal: Math.round(baseCap * 0.55),
        },
        {
          label: "Today",
          actual: Math.round(disposableLeft),
          ideal: Math.round(baseCap * 0.42),
        },
        {
          label: "Day 24 (P)",
          actual: Math.round(disposableLeft * 0.62),
          ideal: Math.round(baseCap * 0.22),
        },
        {
          label: "Day 31 (P)",
          actual: Math.round(disposableLeft * 0.28),
          ideal: 0,
        },
      ];
    }
    if (timeRange === "3M") {
      return [
        { label: "Aug W1", actual: 980, ideal: 900 },
        { label: "Aug W4", actual: 410, ideal: 250 },
        { label: "Sep W2", actual: 790, ideal: 680 },
        { label: "Sep W4", actual: 495, ideal: 310 },
        { label: "Oct W1", actual: 860, ideal: 780 },
        {
          label: "Today",
          actual: Math.round(disposableLeft),
          ideal: Math.round(baseCap - idealSpentAtToday),
        },
      ];
    }
    return [
      { label: "May", actual: 320, ideal: 220 },
      { label: "Jun", actual: 410, ideal: 260 },
      { label: "Jul", actual: 390, ideal: 300 },
      { label: "Aug", actual: 485, ideal: 320 },
      { label: "Sep", actual: 540, ideal: 350 },
      {
        label: "Now",
        actual: Math.round(disposableLeft),
        ideal: Math.round(baseCap - idealSpentAtToday),
      },
    ];
  }, [timeRange, disposableBeforeVariable, disposableLeft, idealSpentAtToday]);

  const handleSaveTargets = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedInc = parseFloat(incomeInput);
    const parsedSav = parseFloat(savingsInput);
    const inc = !isNaN(parsedInc) ? Math.max(0, parsedInc) : monthlyIncome;
    const sav = !isNaN(parsedSav) ? Math.max(0, parsedSav) : savingsTarget;
    updateBudgetTargets(inc, sav);
    setEditingTargets(false);
    showBanner("✅ Monthly Income & Savings Target updated!");
  };

  const handleAddFixedBill = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(fixAmount);
    if (!fixName.trim() || isNaN(amt) || amt <= 0) return;
    addFixedExpense({
      name: fixName.trim(),
      ticker: fixTicker.trim().toUpperCase() || "BILL.FX",
      amount: amt,
      dayOfMonth: parseInt(fixDay, 10) || 5,
      category: "Fixed Bill",
      isPaid: false,
    });
    setFixName("");
    setFixAmount("");
    setShowAddFixed(false);
    showBanner(`✅ Added fixed bill "${fixName.trim()}" (${formatEUR(amt)})`);
  };

  return (
    <div className="space-y-5 pb-24">
      {bannerMsg && (
        <div className="sticky top-16 z-30 p-3.5 rounded-2xl bg-[#30D158] text-[#121214] text-xs font-bold shadow-xl">
          {bannerMsg}
        </div>
      )}

      {/*HERO CARD — APPLE STOCKS PORTFOLIO */}
      <section className="rounded-3xl bg-[#1C1C1E] border border-white/[0.08] p-5 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                DISP.EUR • REAL DISPOSABLE INCOME
              </span>
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${
                  isBullish
                    ? "bg-[#30D158]/15 text-[#30D158]"
                    : "bg-[#FF453A]/15 text-[#FF453A]"
                }`}
              >
                {isBullish ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {isBullish ? "+" : ""}
                {formatEUR(burnDelta)} vs ideal pace
              </span>
            </div>

            <div className="mt-1.5 flex items-baseline gap-3">
              <h2 className="text-4xl font-bold tracking-tight text-white tabular-nums">
                {formatEUR(disposableLeft)}
              </h2>
              <span className="text-xs text-zinc-400 tabular-nums">
                of {formatEUR(disposableBeforeVariable)} free cash
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setIncomeInput(String(monthlyIncome));
              setSavingsInput(String(savingsTarget));
              setEditingTargets(!editingTargets);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2C2C2E] text-xs font-semibold text-zinc-200 hover:text-white border border-white/[0.08]"
            title="Edit Income, Savings & Start New Month"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0A84FF]" />
            Setup Month
          </button>
        </div>

        {/* SETUP MONTH / CHANGE TO NEXT MONTH / CLEAR DEMO DATA PANEL */}
        {editingTargets && (
          <div className="mt-4 p-4 rounded-2xl bg-[#121214] border border-[#0A84FF]/40 space-y-4">
            <form onSubmit={handleSaveTargets} className="space-y-3">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0A84FF]" />
                1. Customize Your Real Monthly Targets
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Monthly Net Income (€)
                  </label>
                  <input
                    type="number"
                    value={incomeInput}
                    onChange={(e) => setIncomeInput(e.target.value)}
                    className="w-full rounded-xl bg-[#2C2C2E] px-3 py-2 text-sm font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Pay-Yourself Savings Target (€)
                  </label>
                  <input
                    type="number"
                    value={savingsInput}
                    onChange={(e) => setSavingsInput(e.target.value)}
                    className="w-full rounded-xl bg-[#2C2C2E] px-3 py-2 text-sm font-bold text-white tabular-nums"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-[#0A84FF] text-xs font-semibold text-white"
              >
                Save Income & Savings Target
              </button>
            </form>

            {/* Start New Month Rollover */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2">
              <div className="text-xs font-semibold text-white">
                2. Roll Over to Next Month / Clear Demo Data
              </div>
              <p className="text-[11px] text-zinc-400">
                Starting a new month resets all envelope spending to €0.00 and marks fixed bills as unpaid for the new month.
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={selectedNextMonth}
                  onChange={(e) => setSelectedNextMonth(e.target.value)}
                  className="flex-1 rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3 py-2 text-xs text-white"
                >
                  {MONTHS_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    startNewMonth(selectedNextMonth);
                    setEditingTargets(false);
                    showBanner(
                      `🚀 Switched to ${selectedNextMonth}! All envelopes reset to €0.00.`
                    );
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#30D158] text-[#121214] text-xs font-bold shrink-0"
                >
                  Start {selectedNextMonth}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  clearAllDemoData();
                  setEditingTargets(false);
                  showBanner(
                    "🧹 All demo transactions, cart items, and demo meals cleared! You are 100% on your own data."
                  );
                }}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-[#FF453A]/15 hover:bg-[#FF453A]/25 border border-[#FF453A]/30 text-[#FF453A] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Wipe All Demo Data (Start 100% Clean)
              </button>
            </div>
          </div>
        )}

        {/* 4 Apple Stocks KPI Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <div
            onClick={() => {
              setIncomeInput(String(monthlyIncome));
              setSavingsInput(String(savingsTarget));
              setEditingTargets(true);
            }}
            className="rounded-2xl bg-[#121214] border border-white/[0.06] p-3 cursor-pointer hover:border-[#0A84FF]/40 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">
                Monthly Income
              </span>
              <Pencil className="w-2.5 h-2.5 text-zinc-500 group-hover:text-[#0A84FF] transition" />
            </div>
            <span className="text-base font-bold text-white tabular-nums mt-0.5 block">
              {formatEUR(monthlyIncome)}
            </span>
            <span className="text-[10px] text-zinc-500 tabular-nums">
              Base salary + bonus
            </span>
          </div>

          <div className="rounded-2xl bg-[#121214] border border-white/[0.06] p-3">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">
              Daily Allowance
            </span>
            <span className="text-base font-bold text-[#30D158] tabular-nums mt-0.5 block">
              {formatEUR(dailyBudgetAllowed)}
              <span className="text-[11px] font-normal text-zinc-400">/d</span>
            </span>
            <span className="text-[10px] text-zinc-500 tabular-nums">
              {remainingDays} days left
            </span>
          </div>

          <div className="rounded-2xl bg-[#121214] border border-white/[0.06] p-3">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">
              Locked Savings
            </span>
            <span className="text-base font-bold text-[#0A84FF] tabular-nums mt-0.5 block">
              {formatEUR(savingsTarget)}
            </span>
            <span className="text-[10px] text-zinc-500 tabular-nums">
              {Math.round(
                (savingsTarget / Math.max(1, monthlyIncome)) * 100
              )}
              % of income
            </span>
          </div>

          <div className="rounded-2xl bg-[#121214] border border-white/[0.06] p-3">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">
              Fixed Bills
            </span>
            <span className="text-base font-bold text-zinc-200 tabular-nums mt-0.5 block">
              {formatEUR(totalFixed)}
            </span>
            <span className="text-[10px] text-zinc-500 tabular-nums">
              {fixedExpenses.length} recurring
            </span>
          </div>
        </div>

        {/* Timeframe Selector (7D, 1M, 3M, ALL) */}
        <div className="flex items-center justify-between mt-5 mb-2">
          <span className="text-xs text-zinc-400 font-medium">
            Burn Rate vs Ideal Trajectory
          </span>
          <div className="flex items-center gap-1 bg-[#121214] p-1 rounded-xl border border-white/[0.06]">
            {(["7D", "1M", "3M", "ALL"] as TimeRange[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeRange(tf)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition tabular-nums ${
                  timeRange === tf
                    ? "bg-[#2C2C2E] text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Recharts AreaChart */}
        <div className="h-48 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 6, left: -22, bottom: 0 }}
            >
              <defs>
                <linearGradient id="bullishGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isBullish ? "#30D158" : "#FF453A"}
                    stopOpacity={0.38}
                  />
                  <stop
                    offset="95%"
                    stopColor={isBullish ? "#30D158" : "#FF453A"}
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                stroke="#636366"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#636366"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `€${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#2C2C2E",
                  borderColor: "rgba(255,255,255,0.12)",
                  borderRadius: "14px",
                  fontSize: "12px",
                  color: "#fff",
                }}
                formatter={(value: unknown, name: unknown) => [
                  formatEUR(Number(value)),
                  name === "actual"
                    ? "Actual Disposable"
                    : "Ideal Trajectory",
                ]}
              />
              <ReferenceLine
                y={0}
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="3 3"
              />
              <Area
                type="monotone"
                dataKey="ideal"
                stroke="#0A84FF"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke={isBullish ? "#30D158" : "#FF453A"}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#bullishGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* BUDGET ENVELOPES WATCHLIST (WITH INLINE BUDGET LIMIT EDITING) */}
      <section className="rounded-3xl bg-[#1C1C1E] border border-white/[0.08] p-5">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Budget Envelopes Watchlist
            </h3>
            <p className="text-[11px] text-zinc-400">
              Tap the pencil icon to customize any monthly envelope limit
            </p>
          </div>
          <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
            {formatEUR(totalVariableSpent)} spent
          </span>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {envelopes.map((env) => {
            const pctUsed = Math.min(
              100,
              Math.round((env.spent / Math.max(1, env.allocated)) * 100)
            );
            const remaining = Number((env.allocated - env.spent).toFixed(2));
            const isSaving = env.trendPct <= 0;
            const isEditingThis = editingEnvId === env.id;

            return (
              <div key={env.id} className="py-3 first:pt-1 last:pb-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#2C2C2E] flex items-center justify-center text-lg shrink-0">
                      {env.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-white tracking-tight">
                          {env.ticker}
                        </span>
                        <span className="text-[11px] text-zinc-400 truncate">
                          {env.name}
                        </span>
                      </div>
                      <div className="w-36 sm:w-44 h-1.5 rounded-full bg-[#2C2C2E] overflow-hidden mt-1.5">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pctUsed}%`,
                            backgroundColor:
                              pctUsed > 85
                                ? "#FF453A"
                                : pctUsed > 70
                                ? "#FF9F0A"
                                : env.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Stock Price & Edit Limit */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white tabular-nums">
                        {formatEUR(remaining)}{" "}
                        <span className="text-[10px] font-normal text-zinc-400">
                          left
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className="text-[10px] text-zinc-400 tabular-nums">
                          {formatEUR(env.spent)}/{formatEUR(env.allocated)}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold tabular-nums ${
                            isSaving
                              ? "bg-[#30D158]/15 text-[#30D158]"
                              : "bg-[#FF453A]/15 text-[#FF453A]"
                          }`}
                        >
                          {env.trendPct > 0
                            ? `+${env.trendPct}%`
                            : `${env.trendPct}%`}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingThis) {
                          setEditingEnvId(null);
                        } else {
                          setEditingEnvId(env.id);
                          setEnvAllocInput(String(env.allocated));
                          setEnvSpentInput(String(env.spent));
                        }
                      }}
                      className="p-1.5 rounded-lg bg-[#2C2C2E] text-zinc-400 hover:text-white"
                      title="Edit monthly budget limit or spent"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isEditingThis && (
                  <div className="mt-2.5 p-3 rounded-xl bg-[#121214] border border-white/[0.08] space-y-2.5">
                    <div className="text-[11px] font-semibold text-zinc-300">
                      Edit {env.ticker} ({env.name})
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">
                          Monthly Limit (€)
                        </label>
                        <input
                          type="number"
                          value={envAllocInput}
                          onChange={(e) => setEnvAllocInput(e.target.value)}
                          className="w-full rounded-lg bg-[#2C2C2E] px-2.5 py-1 text-xs font-bold text-white tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">
                          Current Spent (€)
                        </label>
                        <input
                          type="number"
                          value={envSpentInput}
                          onChange={(e) => setEnvSpentInput(e.target.value)}
                          className="w-full rounded-lg bg-[#2C2C2E] px-2.5 py-1 text-xs font-bold text-white tabular-nums"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingEnvId(null)}
                        className="px-2.5 py-1 rounded-lg bg-[#2C2C2E] text-zinc-400 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const allocVal = parseFloat(envAllocInput);
                          const spentVal = parseFloat(envSpentInput);
                          if (!isNaN(allocVal) && allocVal >= 0) {
                            updateEnvelopeAllocation(env.id, allocVal);
                          }
                          if (!isNaN(spentVal) && spentVal >= 0) {
                            updateEnvelopeSpent(env.id, spentVal);
                          }
                          setEditingEnvId(null);
                          showBanner(`✅ Updated ${env.ticker} envelope settings`);
                        }}
                        className="px-3 py-1 rounded-lg bg-[#0A84FF] text-white text-xs font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FIXED MONTHLY BILLS & AUTO-INVESTMENTS (ADD / DELETE / TOGGLE PAID) */}
      <section className="rounded-3xl bg-[#1C1C1E] border border-white/[0.08] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Fixed Monthly Bills & Auto-Invest
            </h3>
            <p className="text-[11px] text-zinc-400">
              Tap to mark paid/unpaid, or add your own recurring bills
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-300 tabular-nums">
              {formatEUR(totalFixed)}/mo
            </span>
            <button
              type="button"
              onClick={() => setShowAddFixed(!showAddFixed)}
              className="p-1.5 rounded-xl bg-[#2C2C2E] text-[#0A84FF] hover:text-white"
              title="Add a fixed monthly expense"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showAddFixed && (
          <form
            onSubmit={handleAddFixedBill}
            className="mb-3 p-3.5 rounded-2xl bg-[#121214] border border-white/[0.08] space-y-2.5"
          >
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="Bill Name (e.g., Rent)"
                value={fixName}
                onChange={(e) => setFixName(e.target.value)}
                className="col-span-2 rounded-xl bg-[#2C2C2E] px-3 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Ticker"
                value={fixTicker}
                onChange={(e) => setFixTicker(e.target.value)}
                className="rounded-xl bg-[#2C2C2E] px-2.5 py-1.5 text-xs font-mono text-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                step="0.01"
                required
                placeholder="Amount (€)"
                value={fixAmount}
                onChange={(e) => setFixAmount(e.target.value)}
                className="rounded-xl bg-[#2C2C2E] px-3 py-1.5 text-xs text-white tabular-nums"
              />
              <input
                type="number"
                min={1}
                max={31}
                placeholder="Day (1-31)"
                value={fixDay}
                onChange={(e) => setFixDay(e.target.value)}
                className="rounded-xl bg-[#2C2C2E] px-3 py-1.5 text-xs text-white tabular-nums"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#0A84FF] text-white text-xs font-semibold"
              >
                Add Bill
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {fixedExpenses.map((fix) => (
            <div
              key={fix.id}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#121214] border border-white/[0.06] hover:border-white/[0.15] transition"
            >
              <button
                type="button"
                onClick={() => toggleFixedExpensePaid(fix.id)}
                className="flex items-center gap-3 text-left flex-1 min-w-0"
              >
                {fix.isPaid ? (
                  <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-[#FF9F0A] shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-[#0A84FF]">
                      {fix.ticker}
                    </span>
                    <span className="text-xs font-medium text-white truncate">
                      {fix.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 tabular-nums">
                    <Calendar className="w-3 h-3" />
                    <span>Day {fix.dayOfMonth} of month</span>
                    <span>•</span>
                    <span>{fix.category}</span>
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-2.5 shrink-0">
                <div className="text-right">
                  <span className="text-xs font-semibold text-white tabular-nums block">
                    {formatEUR(fix.amount)}
                  </span>
                  <span
                    className={`text-[10px] ${
                      fix.isPaid ? "text-[#30D158]" : "text-[#FF9F0A]"
                    }`}
                  >
                    {fix.isPaid ? "Paid" : "Upcoming"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => deleteFixedExpense(fix.id)}
                  className="text-zinc-500 hover:text-[#FF453A] p-1"
                  title="Delete fixed bill"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* RECENT TRANSACTIONS STREAM */}
      <section className="rounded-3xl bg-[#1C1C1E] border border-white/[0.08] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">
            Recent Transactions Stream
          </h3>
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex items-center gap-1 text-xs font-medium text-[#0A84FF] hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </button>
        </div>

        {transactions.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6">
            No transactions yet for {currentMonthLabel}. Tap the + button below or scan a receipt in Groceries!
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 10).map((tx) => {
              const env = envelopes.find((e) => e.id === tx.envelopeId);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#121214] border border-white/[0.06]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base">
                      {tx.type === "income" ? "💰" : env?.icon || "💳"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {tx.label}
                      </p>
                      <p className="text-[10px] text-zinc-400 tabular-nums">
                        {formatDateLabel(tx.date)} •{" "}
                        {tx.type === "income"
                          ? "INCOME"
                          : env?.ticker || "BUDGET"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        tx.type === "income" ? "text-[#30D158]" : "text-white"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatEUR(tx.amount)}
                    </span>
                    <button
                      onClick={() => {
                        deleteTransaction(tx.id);
                        showBanner(`🗑️ Deleted "${tx.label}" & recalculated balances`);
                      }}
                      className="text-zinc-500 hover:text-[#FF453A] transition"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
