"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinanceStore } from "@/store/useFinanceStore";
import {
  NutritionalFamily,
  VegSubFamily,
  UnitType,
} from "@/lib/seedData";
import { calculateUnitPrice, formatEUR } from "@/lib/utils";
import { X, Wallet, ShoppingCart, CookingPot, Sparkles, Calendar } from "lucide-react";

const FAMILIES: NutritionalFamily[] = [
  "Veggies & Vitamins",
  "Fruits & Antioxidants",
  "Whole Proteins",
  "Complex Carbs",
  "Healthy Fats",
  "Extras / Ultra-Processed",
];

const VEG_SUBFAMILIES: VegSubFamily[] = [
  "Greens & Cruciferous",
  "Orange & Red Veggies",
  "Alliums & Roots",
  "Legumes & Pulses",
];

export function QuickAddModal() {
  const {
    isQuickAddOpen,
    setQuickAddOpen,
    envelopes,
    addTransaction,
    addCustomGroceryItem,
    addBatchMeal,
  } = useFinanceStore();

  const [mode, setMode] = useState<"tx" | "grocery" | "batch">("tx");

  // Transaction state
  const [txLabel, setTxLabel] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [txEnvelopeId, setTxEnvelopeId] = useState("env-food");
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [incomeMode, setIncomeMode] = useState<"salary" | "bonus">("salary");

  // Grocery state
  const [grName, setGrName] = useState("");
  const [grEmoji, setGrEmoji] = useState("🥦");
  const [grFamily, setGrFamily] =
    useState<NutritionalFamily>("Veggies & Vitamins");
  const [grSubFamily, setGrSubFamily] =
    useState<VegSubFamily>("Greens & Cruciferous");
  const [grPrice, setGrPrice] = useState("2.49");
  const [grQty, setGrQty] = useState("1.0");
  const [grUnit, setGrUnit] = useState<UnitType>("kg");
  const [grVitamins, setGrVitamins] = useState("Vit C, Magnesium, Iron");

  // Batch meal state
  const [bmTitle, setBmTitle] = useState("");
  const [bmEmoji, setBmEmoji] = useState("🍝");
  const [bmPortions, setBmPortions] = useState("5");
  const [bmTotalCost, setBmTotalCost] = useState("8.50");
  const [bmPrepTime, setBmPrepTime] = useState("25");
  const [bmVitamins, setBmVitamins] = useState(
    "Vit C, Iron, Magnesium, Omega-3"
  );

  const computedUnitPrice = calculateUnitPrice(
    parseFloat(grPrice) || 0,
    parseFloat(grQty) || 1
  );

  const computedPortionCost =
    (parseFloat(bmTotalCost) || 0) / Math.max(1, parseInt(bmPortions, 10) || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "tx") {
      const amount = parseFloat(txAmount);
      if (isNaN(amount) || amount <= 0) return;
      const defaultLabel =
        txType === "income"
          ? incomeMode === "salary"
            ? "Monthly Net Salary"
            : "Extra Bonus / Income"
          : "Expense";

      const selectedDate = txDate.trim() || new Date().toISOString().split("T")[0];

      addTransaction({
        label: txLabel.trim() || defaultLabel,
        amount,
        date: selectedDate,
        envelopeId: txType === "income" ? "income" : txEnvelopeId,
        type: txType,
        replaceBaseSalary: txType === "income" && incomeMode === "salary",
      });
      setTxLabel("");
      setTxAmount("");
      setTxDate(new Date().toISOString().split("T")[0]);
      setQuickAddOpen(false);
    } else if (mode === "grocery") {
      const price = parseFloat(grPrice);
      const quantity = parseFloat(grQty);
      if (!grName.trim() || isNaN(price) || isNaN(quantity) || quantity <= 0)
        return;

      addCustomGroceryItem({
        name: grName.trim(),
        emoji: grEmoji || "🥦",
        family: grFamily,
        vegSubFamily:
          grFamily === "Veggies & Vitamins" ? grSubFamily : undefined,
        price,
        quantity,
        unit: grUnit,
        vitamins: grVitamins
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      });
      setGrName("");
      setQuickAddOpen(false);
    } else if (mode === "batch") {
      const totalPortions = parseInt(bmPortions, 10) || 4;
      const totalCost = parseFloat(bmTotalCost) || 8;
      if (!bmTitle.trim()) return;

      addBatchMeal({
        title: bmTitle.trim(),
        emoji: bmEmoji || "🍝",
        totalPortions,
        remainingPortions: totalPortions,
        totalCost,
        externalMealPrice: 14.5,
        prepTimeMinutes: parseInt(bmPrepTime, 10) || 25,
        nutriScore: 94,
        vitamins: bmVitamins
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        vegSubFamilies: ["Greens & Cruciferous", "Legumes & Pulses"],
        ingredients: [
          {
            name: "Whole ingredients for batch prep",
            quantityLabel: `${totalPortions} portions`,
            cost: totalCost,
          },
        ],
      });
      setBmTitle("");
      setQuickAddOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {isQuickAddOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQuickAddOpen(false)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 z-50 max-w-lg mx-auto rounded-t-3xl bg-[#1C1C1E] border-t border-white/[0.12] p-5 pb-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Grab Handle */}
            <div className="w-10 h-1.5 rounded-full bg-zinc-700 mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#30D158]" />
                <h2 className="text-base font-semibold text-white">
                  Quick Entry • VitalBudget
                </h2>
              </div>
              <button
                onClick={() => setQuickAddOpen(false)}
                className="w-8 h-8 rounded-full bg-[#2C2C2E] flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Segmented Control */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#121214] border border-white/[0.06] mb-5">
              <button
                type="button"
                onClick={() => setMode("tx")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition ${
                  mode === "tx"
                    ? "bg-[#2C2C2E] text-white shadow"
                    : "text-zinc-400"
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-[#0A84FF]" />
                Transaction
              </button>
              <button
                type="button"
                onClick={() => setMode("grocery")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition ${
                  mode === "grocery"
                    ? "bg-[#2C2C2E] text-white shadow"
                    : "text-zinc-400"
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-[#30D158]" />
                Grocery Item
              </button>
              <button
                type="button"
                onClick={() => setMode("batch")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition ${
                  mode === "batch"
                    ? "bg-[#2C2C2E] text-white shadow"
                    : "text-zinc-400"
                }`}
              >
                <CookingPot className="w-3.5 h-3.5 text-[#FF9F0A]" />
                Batch Meal
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === "tx" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType("expense")}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        txType === "expense"
                          ? "bg-[#FF453A]/15 border-[#FF453A]/40 text-[#FF453A]"
                          : "bg-[#2C2C2E] border-transparent text-zinc-400"
                      }`}
                    >
                      Expense (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType("income")}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        txType === "income"
                          ? "bg-[#30D158]/15 border-[#30D158]/40 text-[#30D158]"
                          : "bg-[#2C2C2E] border-transparent text-zinc-400"
                      }`}
                    >
                      Salary / Income (+)
                    </button>
                  </div>

                  {txType === "income" && (
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#121214] border border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => {
                          setIncomeMode("salary");
                          if (!txLabel) setTxLabel("Monthly Net Salary");
                        }}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold transition ${
                          incomeMode === "salary"
                            ? "bg-[#2C2C2E] text-[#30D158]"
                            : "text-zinc-400"
                        }`}
                      >
                        Set Base Salary (Replaces)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIncomeMode("bonus");
                          if (txLabel === "Monthly Net Salary") setTxLabel("");
                        }}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold transition ${
                          incomeMode === "bonus"
                            ? "bg-[#2C2C2E] text-[#64D2FF]"
                            : "text-zinc-400"
                        }`}
                      >
                        Extra Bonus (+ Adds)
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Transaction Label
                    </label>
                    <input
                      type="text"
                      placeholder={
                        txType === "income"
                          ? "Monthly Net Salary"
                          : "e.g., Farmers Market, Dinner Out..."
                      }
                      value={txLabel}
                      onChange={(e) => setTxLabel(e.target.value)}
                      className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#0A84FF]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Amount (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="24.90"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3.5 py-2.5 text-sm text-white tabular-nums focus:outline-none focus:border-[#0A84FF]"
                      />
                    </div>

                    {txType === "expense" && (
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          Budget Envelope
                        </label>
                        <select
                          value={txEnvelopeId}
                          onChange={(e) => setTxEnvelopeId(e.target.value)}
                          className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0A84FF]"
                        >
                          {envelopes.map((env) => (
                            <option key={env.id} value={env.id}>
                              {env.icon} {env.ticker}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Transaction Date with Shortcuts */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#0A84FF]" />
                        Transaction Date
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTxDate(new Date().toISOString().split("T")[0])}
                          className="px-2 py-0.5 rounded-md bg-[#2C2C2E] hover:bg-white/10 text-[10px] text-zinc-300 font-medium transition"
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() - 1);
                            setTxDate(d.toISOString().split("T")[0]);
                          }}
                          className="px-2 py-0.5 rounded-md bg-[#2C2C2E] hover:bg-white/10 text-[10px] text-zinc-300 font-medium transition"
                        >
                          Yesterday
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const now = new Date();
                            const yyyy = now.getFullYear();
                            const mm = String(now.getMonth() + 1).padStart(2, "0");
                            setTxDate(`${yyyy}-${mm}-01`);
                          }}
                          className="px-2 py-0.5 rounded-md bg-[#2C2C2E] hover:bg-white/10 text-[10px] text-[#0A84FF] font-medium transition"
                        >
                          1st of Month
                        </button>
                      </div>
                    </div>
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#0A84FF] [color-scheme:dark]"
                    />
                  </div>
                </>
              )}

              {mode === "grocery" && (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Icon
                      </label>
                      <input
                        type="text"
                        value={grEmoji}
                        onChange={(e) => setGrEmoji(e.target.value)}
                        className="w-full text-center rounded-xl bg-[#2C2C2E] border border-white/[0.08] py-2.5 text-base"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Food Item Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Sweet Potatoes Bulk"
                        value={grName}
                        onChange={(e) => setGrName(e.target.value)}
                        className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3.5 py-2.5 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Nutritional Family
                      </label>
                      <select
                        value={grFamily}
                        onChange={(e) =>
                          setGrFamily(e.target.value as NutritionalFamily)
                        }
                        className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-2.5 py-2.5 text-xs text-white"
                      >
                        {FAMILIES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                    {grFamily === "Veggies & Vitamins" && (
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          Veggie Sub-Family
                        </label>
                        <select
                          value={grSubFamily}
                          onChange={(e) =>
                            setGrSubFamily(e.target.value as VegSubFamily)
                          }
                          className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-2.5 py-2.5 text-xs text-white"
                        >
                          {VEG_SUBFAMILIES.map((sf) => (
                            <option key={sf} value={sf}>
                              {sf}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Price Paid (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={grPrice}
                        onChange={(e) => setGrPrice(e.target.value)}
                        className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3 py-2 text-sm text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Weight / Vol.
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        value={grQty}
                        onChange={(e) => setGrQty(e.target.value)}
                        className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3 py-2 text-sm text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Unit
                      </label>
                      <select
                        value={grUnit}
                        onChange={(e) => setGrUnit(e.target.value as UnitType)}
                        className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3 py-2 text-sm text-white"
                      >
                        <option value="kg">kg</option>
                        <option value="L">L</option>
                        <option value="unit">unit</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#121214] border border-white/[0.06]">
                    <span className="text-xs text-zinc-400">
                      Calculated Price per {grUnit}:
                    </span>
                    <span className="text-sm font-bold text-[#30D158] tabular-nums">
                      {formatEUR(computedUnitPrice)} / {grUnit}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Key Vitamins & Minerals (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={grVitamins}
                      onChange={(e) => setGrVitamins(e.target.value)}
                      className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3.5 py-2 text-xs text-white"
                    />
                  </div>
                </>
              )}

              {mode === "batch" && (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Emoji
                      </label>
                      <input
                        type="text"
                        value={bmEmoji}
                        onChange={(e) => setBmEmoji(e.target.value)}
                        className="w-full text-center rounded-xl bg-[#2C2C2E] border border-white/[0.08] py-2.5 text-base"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Batch Dish Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Pasta Bolognese, Chicken Stir-Fry"
                        value={bmTitle}
                        onChange={(e) => setBmTitle(e.target.value)}
                        className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3.5 py-2.5 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Portions (4-8)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={bmPortions}
                        onChange={(e) => setBmPortions(e.target.value)}
                        className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3 py-2 text-sm text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Total Cost (€)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={bmTotalCost}
                        onChange={(e) => setBmTotalCost(e.target.value)}
                        className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3 py-2 text-sm text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Prep Time (min)
                      </label>
                      <input
                        type="number"
                        value={bmPrepTime}
                        onChange={(e) => setBmPrepTime(e.target.value)}
                        className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3 py-2 text-sm text-white tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#121214] border border-white/[0.06]">
                    <span className="text-xs text-zinc-400">
                      Cost per portion (Auto DLC calculated):
                    </span>
                    <span className="text-sm font-bold text-[#30D158] tabular-nums">
                      {formatEUR(computedPortionCost)} / portion
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Vitamin Badges (Vit C, B12, Iron, Magnesium, Omega-3)
                    </label>
                    <input
                      type="text"
                      value={bmVitamins}
                      onChange={(e) => setBmVitamins(e.target.value)}
                      className="w-full rounded-xl bg-[#2C2C2E] border border-white/[0.08] px-3.5 py-2 text-xs text-white"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white font-semibold text-sm shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.99]"
              >
                Save Entry
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
