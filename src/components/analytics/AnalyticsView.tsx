"use client";

import React, { useState, useMemo } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatEUR } from "@/lib/utils";
import { VegSubFamily } from "@/lib/seedData";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import {
  Award,
  Cloud,
  Database,
  Download,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

const SUBFAMILIES: {
  key: VegSubFamily;
  shortLabel: string;
  target: number;
  benefits: string;
}[] = [
  {
    key: "Greens & Cruciferous",
    shortLabel: "Greens & Cruciferous",
    target: 4,
    benefits: "Vit K, C, Folate, Sulforaphane (Broccoli, Spinach, Cabbage)",
  },
  {
    key: "Orange & Red Veggies",
    shortLabel: "Orange & Red",
    target: 3,
    benefits: "Beta-Carotene (Vit A), Lycopene (Carrots, Peppers, Squash)",
  },
  {
    key: "Alliums & Roots",
    shortLabel: "Alliums & Roots",
    target: 3,
    benefits: "Allicin, Quercetin, Prebiotics (Garlic, Onions, Leeks)",
  },
  {
    key: "Legumes & Pulses",
    shortLabel: "Legumes & Pulses",
    target: 3,
    benefits: "Iron, Magnesium, Zinc, Fiber (Red Lentils, Chickpeas, Beans)",
  },
];

export function AnalyticsView() {
  const state = useFinanceStore();
  const {
    groceryItems,
    stapleProducts,
    batchMeals,
    transactions,
    resetToSeedData,
    clearAllDemoData,
    importStateJson,
    syncWithSupabase,
    supabaseStatus,
    lastSyncedAt,
  } = state;

  const [supabaseUrl, setSupabaseUrl] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("vitalbudget_supabase_url") || ""
      : ""
  );
  const [supabaseKey, setSupabaseKey] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("vitalbudget_supabase_key") || ""
      : ""
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Veggie Sub-Families Radar Coverage
  const radarData = useMemo(() => {
    return SUBFAMILIES.map((sf) => {
      const inGroceries = groceryItems.filter(
        (g) => g.vegSubFamily === sf.key
      ).length;
      const inBatch = batchMeals.filter((b) =>
        b.vegSubFamilies.includes(sf.key)
      ).length;
      const totalOccurrences = inGroceries + inBatch;
      const score = Math.min(
        100,
        Math.round((totalOccurrences / sf.target) * 100)
      );

      return {
        subject: sf.shortLabel,
        score,
        fullMark: 100,
        occurrences: totalOccurrences,
        benefits: sf.benefits,
      };
    });
  }, [groceryItems, batchMeals]);

  // Top Cost-Effective Whole Foods per Kg
  const topCostEffectiveProducts = useMemo(() => {
    return [...stapleProducts]
      .filter((p) => p.family !== "Extras / Ultra-Processed")
      .map((p) => {
        const unitPrice = Number(
          (p.defaultPrice / Math.max(0.1, p.defaultQuantity)).toFixed(2)
        );
        const valueIndex = Number((p.nutriDensity / unitPrice).toFixed(1));
        return {
          ...p,
          unitPrice,
          valueIndex,
        };
      })
      .sort((a, b) => a.unitPrice - b.unitPrice)
      .slice(0, 6);
  }, [stapleProducts]);

  // Export JSON
  const handleExportJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      currentMonthLabel: state.currentMonthLabel,
      monthlyIncome: state.monthlyIncome,
      savingsTarget: state.savingsTarget,
      envelopes: state.envelopes,
      fixedExpenses: state.fixedExpenses,
      transactions: state.transactions,
      stapleProducts: state.stapleProducts,
      groceryItems: state.groceryItems,
      batchMeals: state.batchMeals,
      restoSkippedDates: state.restoSkippedDates,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vitalbudget-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV (Transactions + Groceries)
  const handleExportCSV = () => {
    const headers = ["Date,Type,Label,Amount_EUR,Category\n"];
    const txRows = transactions.map(
      (t) =>
        `${t.date},${t.type},"${t.label.replace(/"/g, '""')}",${t.amount},${t.envelopeId}`
    );
    const groceryRows = groceryItems.map(
      (g) =>
        `${g.purchasedAt.slice(0, 10)},grocery_unit,"${g.name.replace(
          /"/g,
          '""'
        )} (${g.pricePerUnit}EUR/${g.unit})",${g.price},"${g.family}"`
    );
    const csvContent = headers
      .concat([...txRows, ...groceryRows].join("\n"))
      .join("");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vitalbudget-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result));
        importStateJson(parsed);
        setStatusMessage("JSON backup successfully restored!");
      } catch {
        setStatusMessage("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("vitalbudget_supabase_url", supabaseUrl.trim());
      localStorage.setItem("vitalbudget_supabase_key", supabaseKey.trim());
    }
    const res = await syncWithSupabase();
    setStatusMessage(res.message);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* RADAR OF 4 VEGETABLE SUB-FAMILIES */}
      <section className="rounded-3xl bg-[#1C1C1E] border border-white/[0.08] p-5 shadow-xl">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#64D2FF]">
              MICRONUTRIENT SYNERGY • PREVENTIVE HEALTH
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              4 Vegetable Sub-Families Radar
            </h2>
            <p className="text-xs text-zinc-400">
              Combined coverage across your Grocery Basket and Batch Cooking meals
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.12)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#E5E5EA", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "#8E8E93", fontSize: 9 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#2C2C2E",
                  borderColor: "rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Radar
                name="Coverage (%)"
                dataKey="score"
                stroke="#30D158"
                strokeWidth={2.5}
                fill="#30D158"
                fillOpacity={0.32}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
          {radarData.map((item) => (
            <div
              key={item.subject}
              className="rounded-2xl bg-[#121214] border border-white/[0.06] p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  {item.subject}
                </span>
                <span
                  className={`text-xs font-bold tabular-nums ${
                    item.score >= 80
                      ? "text-[#30D158]"
                      : item.score >= 50
                      ? "text-[#FF9F0A]"
                      : "text-[#FF453A]"
                  }`}
                >
                  {item.score}%
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">{item.benefits}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TOP COST-EFFECTIVE NUTRIENT STAPLES (€/KG) */}
      <section className="rounded-3xl bg-[#1C1C1E] border border-white/[0.08] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-[#30D158]" />
          <div>
            <h3 className="text-sm font-semibold text-white">
              Top Cost-Effective Whole Foods (€/kg)
            </h3>
            <p className="text-[11px] text-zinc-400">
              Lowest unit price per kilogram with highest vitamin & mineral density
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {topCostEffectiveProducts.map((prod, index) => (
            <div
              key={prod.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-[#121214] border border-white/[0.06]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-full bg-[#2C2C2E] text-xs font-mono font-bold text-[#30D158] flex items-center justify-center shrink-0 tabular-nums">
                  #{index + 1}
                </span>
                <span className="text-xl shrink-0">{prod.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {prod.name}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {prod.vitamins.join(" • ")}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 ml-2">
                <span className="text-xs font-bold text-[#30D158] tabular-nums block">
                  {formatEUR(prod.unitPrice)}/{prod.unit}
                </span>
                <span className="text-[10px] text-[#64D2FF] tabular-nums">
                  Density {prod.nutriDensity}/100
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DATA PORTABILITY (JSON & CSV EXPORT/IMPORT + WIPE DEMO) */}
      <section className="rounded-3xl bg-[#1C1C1E] border border-white/[0.08] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#0A84FF]" />
          <div>
            <h3 className="text-sm font-semibold text-white">
              Data Portability & Reset Controls
            </h3>
            <p className="text-[11px] text-zinc-400">
              All changes are automatically persisted in LocalStorage (0 photo bytes stored)
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-2xl bg-[#0A84FF]/15 border border-[#0A84FF]/30 text-xs text-[#64D2FF]">
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] text-xs font-medium text-white transition"
          >
            <Download className="w-3.5 h-3.5 text-[#0A84FF]" />
            Export JSON
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] text-xs font-medium text-white transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#30D158]" />
            Export CSV
          </button>

          <label className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] text-xs font-medium text-white cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-[#64D2FF]" />
            Import JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              resetToSeedData();
              setStatusMessage("Demo seed data restored.");
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] text-xs font-medium text-zinc-300 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restore Demo
          </button>
        </div>

        <button
          onClick={() => {
            clearAllDemoData();
            setStatusMessage(
              "All demo transactions, cart items, and meals wiped! Ready for your real data."
            );
          }}
          className="w-full py-2.5 px-3 rounded-2xl bg-[#FF453A]/15 hover:bg-[#FF453A]/25 border border-[#FF453A]/30 text-xs font-semibold text-[#FF453A] flex items-center justify-center gap-1.5 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Wipe All Demo Data (Start 100% Clean)
        </button>
      </section>

      {/* SUPABASE CLOUD SYNC CONFIGURATION */}
      <section className="rounded-3xl bg-[#1C1C1E] border border-white/[0.08] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#30D158]" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                Supabase Cloud Sync (Optional)
              </h3>
              <p className="text-[11px] text-zinc-400">
                Instant LocalStorage persistence + optional PostgreSQL sync (`supabase/schema.sql`)
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#30D158]/15 text-[#30D158] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            {supabaseStatus === "connected" ? "Cloud Active" : "Local Fast"}
          </span>
        </div>

        <form onSubmit={handleSaveSupabaseConfig} className="space-y-3">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              NEXT_PUBLIC_SUPABASE_URL
            </label>
            <input
              type="url"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3.5 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3.5 py-2 text-xs text-white"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-500 tabular-nums">
              {lastSyncedAt
                ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString(
                    "en-US"
                  )}`
                : "Local browser persistence active (0ms latency)"}
            </span>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-95 transition"
            >
              Test & Sync
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
