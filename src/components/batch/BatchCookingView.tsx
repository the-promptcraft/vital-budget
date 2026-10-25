"use client";

import React, { useState, useMemo } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import {
  buildGoogleCalendarUrl,
  computeMealDlc,
  detectShelfLifeDays,
  formatEUR,
  generateBatchCalendarIcs,
} from "@/lib/utils";
import {
  BatchMeal,
  RECIPE_IDEAS_CATALOG,
  SEED_BATCH_MEALS,
  VegSubFamily,
} from "@/lib/seedData";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CalendarPlus,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Minus,
  Plus,
  Refrigerator,
  RotateCcw,
  ShieldAlert,
  ShoppingCart,
  Snowflake,
  Sparkles,
  Trash2,
  Utensils,
  UtensilsCrossed,
  Zap,
} from "lucide-react";

const ALL_VEG_SUBFAMILIES: VegSubFamily[] = [
  "Greens & Cruciferous",
  "Orange & Red Veggies",
  "Alliums & Roots",
  "Legumes & Pulses",
];

export function BatchCookingView() {
  const {
    batchMeals,
    groceryItems,
    restoSkippedDates,
    consumeBatchPortion,
    restockBatchMeal,
    toggleFreezeBatchMeal,
    addBatchMeal,
    deleteBatchMeal,
    addCustomGroceryItem,
    toggleRestoDate,
  } = useFinanceStore();

  const [showBuilder, setShowBuilder] = useState(false);
  const [builderMode, setBuilderMode] = useState<"express" | "complet">(
    "express"
  );
  const [expandedStepsId, setExpandedStepsId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Express & Detailed fields
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🍝");
  const [portions, setPortions] = useState("5");
  const [expressTotalCost, setExpressTotalCost] = useState("8.90");
  const [customShelfLife, setCustomShelfLife] = useState<string>("");
  const [prepTime, setPrepTime] = useState("25");
  const [externalPrice, setExternalPrice] = useState("14.50");
  const [vitaminsInput, setVitaminsInput] = useState(
    "Vit C, Vit B12, Iron, Magnesium, Omega-3"
  );
  const [stepsInput, setStepsInput] = useState(
    "Boil the complex carb base (pasta/rice/lentils).\nSauté the vegetables and protein in a skillet.\nCombine with spices and divide into airtight meal-prep containers."
  );
  const [selectedSubFamilies, setSelectedSubFamilies] = useState<
    VegSubFamily[]
  >(["Greens & Cruciferous", "Legumes & Pulses"]);
  const [ingredients, setIngredients] = useState([
    {
      name: "Ground Beef / Chicken / Tuna / Lentils",
      quantityLabel: "500g",
      cost: "5.40",
    },
    {
      name: "Fresh or frozen whole vegetables",
      quantityLabel: "700g",
      cost: "2.10",
    },
    {
      name: "Whole-wheat pasta / Basmati rice",
      quantityLabel: "500g",
      cost: "1.40",
    },
  ]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Live automatic Use-By Date (DLC) detection while typing dish name
  const liveDetectedDlc = useMemo(() => {
    const ingText = ingredients.map((i) => i.name).join(" ");
    return detectShelfLifeDays(title || "Pasta Bolognese", ingText);
  }, [title, ingredients]);

  const effectiveShelfLifeDays = customShelfLife
    ? parseInt(customShelfLife, 10) || liveDetectedDlc.days
    : liveDetectedDlc.days;

  // Enrich each batchMeal with steps, macros, and computed Use-By Date (DLC)
  const enrichedMeals = useMemo(() => {
    return batchMeals.map((rawMeal) => {
      const seedMatch = SEED_BATCH_MEALS.find((s) => s.id === rawMeal.id);
      const meal: BatchMeal = {
        ...rawMeal,
        steps: rawMeal.steps ?? seedMatch?.steps,
        macros: rawMeal.macros ?? seedMatch?.macros,
      };
      const ingText = meal.ingredients.map((i) => i.name).join(" ");
      const dlc = computeMealDlc(
        meal.lastCookedAt,
        meal.title,
        ingText,
        meal.shelfLifeDays,
        meal.isFrozen
      );
      return { meal, dlc };
    });
  }, [batchMeals]);

  // Global Batch Cooking Summary
  const summary = useMemo(() => {
    const totalPortionsInFridge = batchMeals.reduce(
      (sum, m) => sum + m.remainingPortions,
      0
    );
    const avgCostPerPortion =
      batchMeals.length > 0
        ? batchMeals.reduce((sum, m) => sum + m.costPerPortion, 0) /
          batchMeals.length
        : 0;
    const totalSavingsGenerated = batchMeals.reduce(
      (sum, m) =>
        sum + (m.externalMealPrice - m.costPerPortion) * m.totalPortions,
      0
    );
    return {
      totalPortionsInFridge,
      avgCostPerPortion,
      totalSavingsGenerated,
    };
  }, [batchMeals]);

  // ==========================================================================
  // EVENING MEAL PLANNER (GOOGLE CALENDAR + SKIP FOR EATING OUT + DLC FIFO)
  // ==========================================================================
  const eveningSchedule = useMemo(() => {
    // Sort active fridge meals by shortest Use-By Date first (FIFO zero-waste)
    const sortedQueue: {
      mealId: string;
      title: string;
      emoji: string;
      costPerPortion: number;
      dlcFormatted: string;
      dlcDateIso: string;
      isFrozen?: boolean;
    }[] = [];

    const activeSorted = [...enrichedMeals]
      .filter((x) => x.meal.remainingPortions > 0 && !x.meal.isFrozen)
      .sort((a, b) => a.dlc.daysLeft - b.dlc.daysLeft);

    activeSorted.forEach(({ meal, dlc }) => {
      for (let i = 0; i < meal.remainingPortions; i++) {
        sortedQueue.push({
          mealId: meal.id,
          title: meal.title,
          emoji: meal.emoji,
          costPerPortion: meal.costPerPortion,
          dlcFormatted: dlc.dlcFormatted,
          dlcDateIso: dlc.dlcDateIso,
          isFrozen: meal.isFrozen,
        });
      }
    });

    const days: {
      dateYmd: string;
      dayLabel: string;
      isResto: boolean;
      assignedMeal: (typeof sortedQueue)[number] | null;
      isAfterDlc: boolean;
    }[] = [];

    let queueIdx = 0;
    const today = new Date();

    for (let offset = 0; offset < 7; offset++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      const dateYmd = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      const isResto = restoSkippedDates.includes(dateYmd);
      if (isResto) {
        days.push({
          dateYmd,
          dayLabel,
          isResto: true,
          assignedMeal: null,
          isAfterDlc: false,
        });
      } else {
        const nextMeal = sortedQueue[queueIdx] || null;
        if (nextMeal) queueIdx++;
        const isAfterDlc =
          nextMeal !== null &&
          new Date(dateYmd).getTime() >
            new Date(nextMeal.dlcDateIso.split("T")[0]).getTime();

        days.push({
          dateYmd,
          dayLabel,
          isResto: false,
          assignedMeal: nextMeal,
          isAfterDlc,
        });
      }
    }

    return days;
  }, [enrichedMeals, restoSkippedDates]);

  const builderTotalCost = useMemo(() => {
    if (builderMode === "express") {
      return parseFloat(expressTotalCost) || 0;
    }
    return ingredients.reduce(
      (sum, ing) => sum + (parseFloat(ing.cost) || 0),
      0
    );
  }, [builderMode, expressTotalCost, ingredients]);

  const builderPortionCost = useMemo(() => {
    const p = Math.max(1, parseInt(portions, 10) || 1);
    return builderTotalCost / p;
  }, [builderTotalCost, portions]);

  // Recalculate ingredient costs from latest scanned receipt / grocery items
  const handleSyncPricesFromReceipt = () => {
    if (groceryItems.length === 0) {
      triggerToast("No items in Groceries to sync prices from.");
      return;
    }

    const updated = ingredients.map((ing) => {
      const words = ing.name
        .toLowerCase()
        .split(/[\s,/()]+/)
        .filter((w) => w.length >= 4);
      const matchedGrocery = groceryItems.find((g) =>
        words.some((w) => g.name.toLowerCase().includes(w))
      );
      if (matchedGrocery) {
        return {
          ...ing,
          cost: String(matchedGrocery.price.toFixed(2)),
        };
      }
      return ing;
    });

    setIngredients(updated);
    const newSum = updated.reduce((s, i) => s + (parseFloat(i.cost) || 0), 0);
    setExpressTotalCost(newSum.toFixed(2));
    triggerToast(
      `🔄 Cost recalculated from your latest scanned receipt prices: ${formatEUR(
        newSum
      )} total!`
    );
  };

  const toggleSubFamily = (sf: VegSubFamily) => {
    setSelectedSubFamilies((prev) =>
      prev.includes(sf) ? prev.filter((item) => item !== sf) : [...prev, sf]
    );
  };

  const handleAddIngredientRow = () => {
    setIngredients([
      ...ingredients,
      { name: "", quantityLabel: "250g", cost: "1.50" },
    ]);
  };

  const handleCreateRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const totalPortions = Math.max(1, parseInt(portions, 10) || 5);
    const finalCost = Number(builderTotalCost.toFixed(2));

    addBatchMeal({
      title: title.trim(),
      emoji: emoji || "🍝",
      totalPortions,
      remainingPortions: totalPortions,
      totalCost: finalCost,
      externalMealPrice: parseFloat(externalPrice) || 14.5,
      prepTimeMinutes: parseInt(prepTime, 10) || 25,
      nutriScore: 95,
      shelfLifeDays: effectiveShelfLifeDays,
      vitamins: vitaminsInput
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      vegSubFamilies: selectedSubFamilies,
      ingredients:
        builderMode === "express"
          ? [
              {
                name: "Complete batch ingredients",
                quantityLabel: `${totalPortions} portions`,
                cost: finalCost,
              },
            ]
          : ingredients
              .filter((i) => i.name.trim())
              .map((i) => ({
                name: i.name.trim(),
                quantityLabel: i.quantityLabel,
                cost: parseFloat(i.cost) || 0,
              })),
      steps:
        builderMode === "complet"
          ? stepsInput
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
    });

    setTitle("");
    setCustomShelfLife("");
    setShowBuilder(false);
    triggerToast(
      `✅ "${title.trim()}" added to fridge (${totalPortions} portions • Auto Use-By: +${effectiveShelfLifeDays} days)!`
    );
  };

  const handleSendIngredientsToGroceries = (meal: BatchMeal) => {
    meal.ingredients.forEach((ing) => {
      addCustomGroceryItem({
        name: `${ing.name} (${meal.title.slice(0, 18)}...)`,
        emoji: meal.emoji,
        family: "Veggies & Vitamins",
        vegSubFamily: meal.vegSubFamilies[0] || "Greens & Cruciferous",
        price: ing.cost,
        quantity: 1,
        unit: "unit",
        vitamins: meal.vitamins.slice(0, 3),
      });
    });
    triggerToast(
      `🛒 Sent ${meal.ingredients.length} ingredients from "${meal.title}" to your Grocery List!`
    );
  };

  const handleCookFromCatalog = (
    idea: Omit<BatchMeal, "id" | "lastCookedAt">
  ) => {
    addBatchMeal(idea);
    const dlcDays =
      idea.shelfLifeDays ?? detectShelfLifeDays(idea.title).days;
    triggerToast(
      `👨‍🍳 Cooked "${idea.title}" (${idea.totalPortions} portions at ${formatEUR(
        idea.costPerPortion
      )}/meal • Use-By: ${dlcDays} days)!`
    );
  };

  const handleExportWeekToCalendar = () => {
    const events = eveningSchedule
      .filter((d) => !d.isResto && d.assignedMeal !== null)
      .map((d) => ({
        title: `${d.assignedMeal!.emoji} Batch: ${
          d.assignedMeal!.title
        } (${formatEUR(d.assignedMeal!.costPerPortion)})`,
        dateYmd: d.dateYmd,
        details: `Kora Batch Cooking Dinner\nPortion Cost: ${formatEUR(
          d.assignedMeal!.costPerPortion
        )}\nUse by: ${d.assignedMeal!.dlcFormatted}`,
      }));

    if (events.length === 0) {
      triggerToast("No Batch meals scheduled for this week.");
      return;
    }

    const icsContent = generateBatchCalendarIcs(events);
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vitalbudget-evening-meals.ics";
    a.click();
    URL.revokeObjectURL(url);
    triggerToast(
      "📅 Calendar file (.ics) downloaded! Open it to import all dinners into Google Calendar or Apple Calendar."
    );
  };

  return (
    <div className="space-y-5 pb-24">
      {toastMessage && (
        <div className="sticky top-16 z-30 p-3.5 rounded-2xl bg-[#30D158] text-[#121214] text-xs font-bold shadow-xl flex items-center justify-between">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HERO: COST PER PORTION, USE-BY DATE (DLC) & FRIDGE STOCK */}
      <section className="rounded-3xl apple-glass border border-black/[0.07] p-5 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#30D158]">
              AUTO USE-BY DATE (DLC) & EVENING PLANNER
            </span>
            <h2 className="text-xl font-bold text-[#1D1D1F] mt-0.5">
              Batch Cooking & Fridge Stock
            </h2>
          </div>

          <button
            onClick={() => setShowBuilder(!showBuilder)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#0A84FF] text-[#1D1D1F] text-xs font-semibold shadow-md shadow-[#0A84FF]/20 hover:opacity-95 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            Log Cooked Batch
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-4">
          <div className="rounded-2xl bg-white/70 border border-black/[0.07] p-3">
            <span className="text-[10px] text-[#6E6E73] uppercase block">
              Avg Cost
            </span>
            <span className="text-lg font-bold text-[#30D158] tabular-nums mt-0.5 block">
              {formatEUR(summary.avgCostPerPortion)}
            </span>
            <span className="text-[10px] text-[#86868B]">per portion</span>
          </div>

          <div className="rounded-2xl bg-white/70 border border-black/[0.07] p-3">
            <span className="text-[10px] text-[#6E6E73] uppercase block">
              Fridge Stock
            </span>
            <span className="text-lg font-bold text-[#64D2FF] tabular-nums mt-0.5 block">
              {summary.totalPortionsInFridge} meals
            </span>
            <span className="text-[10px] text-[#86868B]">ready to eat</span>
          </div>

          <div className="rounded-2xl bg-white/70 border border-black/[0.07] p-3">
            <span className="text-[10px] text-[#6E6E73] uppercase block">
              Total Saved
            </span>
            <span className="text-lg font-bold text-[#1D1D1F] tabular-nums mt-0.5 block">
              +{formatEUR(summary.totalSavingsGenerated)}
            </span>
            <span className="text-[10px] text-[#30D158]">vs eating out</span>
          </div>
        </div>
      </section>

      {/* FORM: LOG A COOKED BATCH (WITH AUTO USE-BY DATE & RECEIPT PRICE SYNC) */}
      {showBuilder && (
        <form
          onSubmit={handleCreateRecipe}
          className="rounded-3xl apple-glass border border-[#0A84FF]/40 p-5 space-y-4 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1D1D1F] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#64D2FF]" />
              Log a Cooked Batch Meal
            </h3>
            <span className="text-xs font-mono text-[#30D158] font-bold tabular-nums">
              = {formatEUR(builderPortionCost)} / portion
            </span>
          </div>

          {/* Segmented Mode: 2-Click Express vs Full Recipe */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/70 border border-black/[0.07]">
            <button
              type="button"
              onClick={() => setBuilderMode("express")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
                builderMode === "express"
                  ? "bg-black/[0.04] text-[#30D158] shadow"
                  : "text-[#6E6E73]"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              2-Click Express
            </button>
            <button
              type="button"
              onClick={() => setBuilderMode("complet")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
                builderMode === "complet"
                  ? "bg-black/[0.04] text-[#64D2FF] shadow"
                  : "text-[#6E6E73]"
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              Full Ingredients & Steps
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="rounded-xl bg-black/[0.04] border border-black/[0.07] text-center py-2.5 text-lg"
            />
            <input
              type="text"
              required
              placeholder="e.g., Pasta Bolognese, Chicken Curry, Chili..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3 rounded-xl bg-black/[0.04] border border-black/[0.07] px-3.5 py-2.5 text-sm text-[#1D1D1F]"
            />
          </div>

          {/* Automatic Use-By Date (DLC) Banner */}
          <div className="rounded-2xl bg-white/70 border border-[#64D2FF]/30 p-3 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-[#64D2FF] flex items-center gap-1.5">
                ⏳ Auto Use-By Date (DLC): +{effectiveShelfLifeDays} days in fridge
              </span>
              <p className="text-[10px] text-[#6E6E73] mt-0.5">
                {liveDetectedDlc.reason}
              </p>
            </div>
            <div className="shrink-0">
              <label className="block text-[9px] text-[#86868B] text-right mb-0.5">
                Override (d)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                placeholder={String(liveDetectedDlc.days)}
                value={customShelfLife}
                onChange={(e) => setCustomShelfLife(e.target.value)}
                className="w-16 rounded-xl bg-black/[0.04] border border-white/[0.1] px-2.5 py-1 text-xs font-bold text-[#1D1D1F] text-center tabular-nums"
              />
            </div>
          </div>

          {builderMode === "express" ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#6E6E73] mb-1">
                    Number of Portions Cooked
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={portions}
                    onChange={(e) => setPortions(e.target.value)}
                    className="w-full rounded-xl bg-black/[0.04] border border-black/[0.07] px-3.5 py-2.5 text-sm font-bold text-[#1D1D1F] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#6E6E73] mb-1">
                    Total Batch Cost (€)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={expressTotalCost}
                    onChange={(e) => setExpressTotalCost(e.target.value)}
                    className="w-full rounded-xl bg-black/[0.04] border border-black/[0.07] px-3.5 py-2.5 text-sm font-bold text-[#30D158] tabular-nums"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSyncPricesFromReceipt}
                className="w-full py-2 px-3 rounded-xl bg-black/[0.04] hover:bg-[#3A3A3C] text-[11px] font-medium text-[#64D2FF] flex items-center justify-center gap-1.5 transition"
              >
                🔄 Calculate cost using my latest scanned receipt prices
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-[#6E6E73] mb-1">
                    Portions
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={portions}
                    onChange={(e) => setPortions(e.target.value)}
                    className="w-full rounded-xl bg-black/[0.04] px-3 py-2 text-xs text-[#1D1D1F] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#6E6E73] mb-1">
                    Time (min)
                  </label>
                  <input
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    className="w-full rounded-xl bg-black/[0.04] px-3 py-2 text-xs text-[#1D1D1F] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#6E6E73] mb-1">
                    Takeout Equiv. (€)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={externalPrice}
                    onChange={(e) => setExternalPrice(e.target.value)}
                    className="w-full rounded-xl bg-black/[0.04] px-3 py-2 text-xs text-[#1D1D1F] tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#3A3A3C]">
                    Batch Ingredients
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSyncPricesFromReceipt}
                      className="text-[11px] text-[#30D158] hover:underline"
                    >
                      🔄 Sync Receipt Prices
                    </button>
                    <button
                      type="button"
                      onClick={handleAddIngredientRow}
                      className="text-[11px] text-[#0A84FF] hover:underline"
                    >
                      + Add Row
                    </button>
                  </div>
                </div>
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-1.5">
                    <input
                      type="text"
                      placeholder="Ingredient"
                      value={ing.name}
                      onChange={(e) => {
                        const copy = [...ingredients];
                        copy[idx].name = e.target.value;
                        setIngredients(copy);
                      }}
                      className="col-span-3 rounded-xl bg-black/[0.04] px-2.5 py-1.5 text-xs text-[#1D1D1F]"
                    />
                    <input
                      type="text"
                      placeholder="Qty"
                      value={ing.quantityLabel}
                      onChange={(e) => {
                        const copy = [...ingredients];
                        copy[idx].quantityLabel = e.target.value;
                        setIngredients(copy);
                      }}
                      className="col-span-1 rounded-xl bg-black/[0.04] px-2 py-1.5 text-xs text-[#1D1D1F] tabular-nums"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="€"
                      value={ing.cost}
                      onChange={(e) => {
                        const copy = [...ingredients];
                        copy[idx].cost = e.target.value;
                        setIngredients(copy);
                      }}
                      className="col-span-2 rounded-xl bg-black/[0.04] px-2.5 py-1.5 text-xs text-[#1D1D1F] tabular-nums"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[11px] text-[#6E6E73] mb-1">
                  Cooking Steps (1 step per line)
                </label>
                <textarea
                  rows={3}
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  className="w-full rounded-xl bg-black/[0.04] border border-black/[0.07] p-3 text-xs text-[#1D1D1F]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#6E6E73] mb-1">
                  Key Vitamins & Minerals (comma-separated)
                </label>
                <input
                  type="text"
                  value={vitaminsInput}
                  onChange={(e) => setVitaminsInput(e.target.value)}
                  className="w-full rounded-xl bg-black/[0.04] border border-black/[0.07] px-3 py-2 text-xs text-[#1D1D1F]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#6E6E73] mb-1.5">
                  Veggie Sub-Families Included
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_VEG_SUBFAMILIES.map((sf) => {
                    const active = selectedSubFamilies.includes(sf);
                    return (
                      <button
                        key={sf}
                        type="button"
                        onClick={() => toggleSubFamily(sf)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                          active
                            ? "bg-[#30D158]/20 border-[#30D158] text-[#30D158]"
                            : "bg-black/[0.04] border-transparent text-[#6E6E73]"
                        }`}
                      >
                        {sf}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-[#30D158] text-[#121214] font-bold text-xs shadow-lg hover:opacity-95 transition"
          >
            Save to Fridge ({formatEUR(builderPortionCost)}/portion • Use-By +
            {effectiveShelfLifeDays}d)
          </button>
        </form>
      )}

      {/* =====================================================================
          EVENING MEAL PLANNER + GOOGLE CALENDAR + SKIP EATING OUT
         ===================================================================== */}
      <section className="rounded-3xl apple-glass border border-black/[0.07] p-5 space-y-3.5 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#0A84FF]">
              GOOGLE CALENDAR & ZERO-WASTE FIFO SCHEDULE
            </span>
            <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-4 h-4 text-[#0A84FF]" />
              Evening Meal Schedule (Shortest Use-By First)
            </h3>
            <p className="text-[11px] text-[#6E6E73]">
              Tap &ldquo;🍽️ Eating Out&rdquo; on any night you go to a restaurant: your batch meal automatically skips that night and shifts to the next day.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportWeekToCalendar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/30 text-[#0A84FF] text-xs font-semibold transition shrink-0"
            title="Download .ics file to sync the entire week with Google Calendar or Apple Calendar"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Sync Week
          </button>
        </div>

        <div className="space-y-2">
          {eveningSchedule.map((slot) => {
            const gcalUrl =
              slot.assignedMeal !== null
                ? buildGoogleCalendarUrl({
                    title: `${slot.assignedMeal.emoji} Batch: ${
                      slot.assignedMeal.title
                    } (${formatEUR(slot.assignedMeal.costPerPortion)})`,
                    dateYmd: slot.dateYmd,
                    details: `Dinner scheduled by Kora.\nPortion Cost: ${formatEUR(
                      slot.assignedMeal.costPerPortion
                    )}\nUse by: ${slot.assignedMeal.dlcFormatted}`,
                  })
                : null;

            return (
              <div
                key={slot.dateYmd}
                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2.5 ${
                  slot.isResto
                    ? "bg-[#FF9F0A]/10 border-[#FF9F0A]/35"
                    : slot.isAfterDlc
                    ? "bg-[#FF453A]/10 border-[#FF453A]/40"
                    : "bg-white/70 border-black/[0.07]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-16 shrink-0">
                    <span className="text-xs font-bold text-[#1D1D1F] block">
                      {slot.dayLabel}
                    </span>
                    <span className="text-[10px] text-[#86868B]">8:00 PM</span>
                  </div>

                  {slot.isResto ? (
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-[#FF9F0A] flex items-center gap-1">
                        🍽️ Eating Out / Restaurant Night
                      </span>
                      <span className="text-[10px] text-[#6E6E73] block">
                        Batch meal automatically skipped & shifted to tomorrow night
                      </span>
                    </div>
                  ) : slot.assignedMeal ? (
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span>{slot.assignedMeal.emoji}</span>
                        <span className="text-xs font-semibold text-[#1D1D1F] truncate">
                          {slot.assignedMeal.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono text-[#30D158] tabular-nums">
                          {formatEUR(slot.assignedMeal.costPerPortion)}/portion
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span
                          className={`text-[10px] font-medium ${
                            slot.isAfterDlc
                              ? "text-[#FF453A] font-bold"
                              : "text-[#6E6E73]"
                          }`}
                        >
                          {slot.isAfterDlc
                            ? "⚠️ Past Use-By Date (Freeze this portion!)"
                            : `Use by ${slot.assignedMeal.dlcFormatted}`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-[#86868B] italic">
                      No portions left — Cook a new Batch below
                    </span>
                  )}
                </div>

                {/* Night Actions: Google Calendar + Toggle Eating Out */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {gcalUrl && !slot.isResto && (
                    <a
                      href={gcalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-black/[0.04] hover:bg-[#0A84FF] text-[11px] font-medium text-[#1D1D1F] hover:text-[#1D1D1F] transition flex items-center gap-1"
                      title="Add this dinner to Google Calendar"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">GCal</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleRestoDate(slot.dateYmd)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center gap-1 ${
                      slot.isResto
                        ? "bg-[#FF9F0A] text-[#121214]"
                        : "bg-black/[0.04] text-[#3A3A3C] hover:text-[#1D1D1F]"
                    }`}
                    title="Mark as Restaurant night to skip & shift your Batch meal"
                  >
                    <UtensilsCrossed className="w-3 h-3" />
                    {slot.isResto ? "Undo Out" : "Eating Out"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ACTIVE FRIDGE MEALS WITH USE-BY DATE (DLC) & RECIPES */}
      <div className="space-y-4">
        {enrichedMeals.map(({ meal, dlc }) => {
          const savingPerPortion = Number(
            (meal.externalMealPrice - meal.costPerPortion).toFixed(2)
          );
          const totalBatchSaving = Number(
            (savingPerPortion * meal.totalPortions).toFixed(2)
          );
          const stockRatio =
            (meal.remainingPortions / Math.max(1, meal.totalPortions)) * 100;
          const isExpanded = expandedStepsId === meal.id;

          return (
            <article
              key={meal.id}
              className="rounded-3xl apple-glass border border-black/[0.07] p-5 space-y-3.5 shadow-lg"
            >
              {/* Top Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-black/[0.04] flex items-center justify-center text-2xl shrink-0">
                    {meal.emoji}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1D1D1F] leading-snug">
                      {meal.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#6E6E73] tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#0A84FF]" />
                        {meal.prepTimeMinutes} min
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-[#64D2FF]">
                        <Flame className="w-3 h-3" />
                        Score {meal.nutriScore}/100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price per portion badge */}
                <div className="text-right shrink-0">
                  <div className="px-2.5 py-1 rounded-xl bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] font-bold text-sm tabular-nums">
                    {formatEUR(meal.costPerPortion)}
                    <span className="text-[10px] font-normal">/portion</span>
                  </div>
                  <span className="text-[10px] text-[#6E6E73] tabular-nums block mt-0.5">
                    Total: {formatEUR(meal.totalCost)}
                  </span>
                </div>
              </div>

              {/* AUTOMATIC USE-BY DATE (DLC) BANNER & FREEZE BUTTON */}
              <div
                className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 ${
                  dlc.status === "expired"
                    ? "bg-[#FF453A]/15 border-[#FF453A]/40 text-[#FF453A]"
                    : dlc.status === "warning"
                    ? "bg-[#FF9F0A]/15 border-[#FF9F0A]/40 text-[#FF9F0A]"
                    : dlc.status === "frozen"
                    ? "bg-[#64D2FF]/15 border-[#64D2FF]/40 text-[#64D2FF]"
                    : "bg-[#30D158]/10 border-[#30D158]/30 text-[#30D158]"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    {dlc.status === "expired" && (
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                    )}
                    {dlc.status === "warning" && (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{dlc.badgeLabel}</span>
                  </div>
                  <p className="text-[10px] opacity-80 truncate mt-0.5">
                    {dlc.reason}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleFreezeBatchMeal(meal.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 shrink-0 transition ${
                    meal.isFrozen
                      ? "bg-[#64D2FF] text-[#121214]"
                      : "bg-white/70 text-[#64D2FF] hover:bg-white/70"
                  }`}
                  title="Freeze or unfreeze this meal (extends Use-By Date to +90 days)"
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  {meal.isFrozen ? "Unfreeze" : "Freeze"}
                </button>
              </div>

              {/* Vitamin Badges */}
              <div className="flex flex-wrap gap-1.5">
                {meal.vitamins.map((vit) => (
                  <span
                    key={vit}
                    className="px-2 py-0.5 rounded-full bg-[#64D2FF]/15 border border-[#64D2FF]/30 text-[#64D2FF] text-[10px] font-semibold"
                  >
                    ⚡ {vit}
                  </span>
                ))}
              </div>

              {/* Recipe & Grocery Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedStepsId(isExpanded ? null : meal.id)
                  }
                  className="flex-1 flex items-center justify-between px-3.5 py-2 rounded-xl bg-black/[0.04] hover:bg-[#3A3A3C] text-xs font-medium text-[#1D1D1F] transition"
                >
                  <span className="flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-[#64D2FF]" />
                    {isExpanded
                      ? "Hide Recipe & Steps"
                      : "View Step-by-Step Recipe"}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#6E6E73]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#6E6E73]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSendIngredientsToGroceries(meal)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/30 text-[#0A84FF] text-xs font-semibold transition shrink-0"
                  title="Send all recipe ingredients to your Grocery List"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Groceries
                </button>
              </div>

              {/* Collapsible Panel: Ingredients + Step-by-Step Instructions */}
              {isExpanded && (
                <div className="rounded-2xl bg-white/70 border border-white/[0.07] p-3.5 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-[#6E6E73] pb-1.5 border-b border-black/[0.07]">
                      <span className="flex items-center gap-1 font-semibold text-[#1D1D1F]">
                        <Utensils className="w-3 h-3 text-[#30D158]" />
                        Ingredients ({meal.totalPortions} portions)
                      </span>
                      <span className="text-[#30D158] font-semibold tabular-nums">
                        Saved: +{formatEUR(totalBatchSaving)} vs Eating Out
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2">
                      {meal.ingredients.map((ing, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs text-[#3A3A3C]"
                        >
                          <span className="truncate">
                            • {ing.name}{" "}
                            <span className="text-[#86868B]">
                              ({ing.quantityLabel})
                            </span>
                          </span>
                          <span className="font-mono text-[#6E6E73] tabular-nums ml-2">
                            {formatEUR(ing.cost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {meal.steps && meal.steps.length > 0 && (
                    <div className="pt-2 border-t border-black/[0.07]">
                      <p className="text-[11px] font-semibold text-[#64D2FF] mb-2 flex items-center gap-1.5">
                        <ChefHat className="w-3.5 h-3.5" />
                        Step-by-Step Preparation:
                      </p>
                      <ol className="space-y-1.5">
                        {meal.steps.map((step, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-[#3A3A3C] leading-relaxed flex items-start gap-2"
                          >
                            <span className="w-4 h-4 rounded-full bg-black/[0.04] text-[10px] font-mono font-bold text-[#30D158] flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Fridge Stock Counter (-1 portion / Re-cook Batch) */}
              <div className="pt-1 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#3A3A3C] flex items-center gap-1.5 font-medium">
                      <Refrigerator className="w-3.5 h-3.5 text-[#64D2FF]" />
                      Fridge Stock:
                    </span>
                    <span className="font-bold text-[#1D1D1F] tabular-nums">
                      {meal.remainingPortions} / {meal.totalPortions} portions
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${stockRatio}%`,
                        backgroundColor:
                          meal.remainingPortions === 0
                            ? "#FF453A"
                            : meal.remainingPortions <= 1
                            ? "#FF9F0A"
                            : "#64D2FF",
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => consumeBatchPortion(meal.id)}
                    disabled={meal.remainingPortions === 0}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-black/[0.04] hover:bg-[#3A3A3C] disabled:opacity-40 text-[#1D1D1F] text-xs font-semibold transition active:scale-95 tabular-nums"
                  >
                    <Minus className="w-3.5 h-3.5 text-[#FF9F0A]" />1 portion
                  </button>

                  <button
                    onClick={() => restockBatchMeal(meal.id)}
                    title="Re-cook this batch today (resets portions & starts a fresh Use-By Date)"
                    className="p-2 rounded-xl bg-[#0A84FF]/15 text-[#0A84FF] hover:bg-[#0A84FF]/25 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => deleteBatchMeal(meal.id)}
                    title="Delete recipe"
                    className="p-2 rounded-xl bg-black/[0.04] text-[#6E6E73] hover:text-[#FF453A] transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* RECIPE IDEAS CATALOG (1-CLICK COOK) */}
      <section className="rounded-3xl apple-glass border border-black/[0.07] p-5 space-y-3.5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#30D158]" />
          <div>
            <h3 className="text-sm font-semibold text-[#1D1D1F]">
              Batch Recipe Catalog (Bolognese, Chili, Frittata...)
            </h3>
            <p className="text-[11px] text-[#6E6E73]">
              Tap &ldquo;+ Cook Batch&rdquo; to add it to your fridge with automatic Use-By Date tracking
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {RECIPE_IDEAS_CATALOG.map((idea, idx) => {
            const dlcDays =
              idea.shelfLifeDays ?? detectShelfLifeDays(idea.title).days;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white/70 border border-white/[0.07] p-3.5 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{idea.emoji}</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#1D1D1F]">
                        {idea.title}
                      </h4>
                      <p className="text-[11px] text-[#6E6E73] tabular-nums">
                        {idea.totalPortions} portions • Use-By {dlcDays}d •{" "}
                        <strong className="text-[#30D158]">
                          {formatEUR(idea.costPerPortion)}/portion
                        </strong>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCookFromCatalog(idea)}
                    className="px-3 py-1.5 rounded-xl bg-[#30D158] text-[#121214] text-xs font-bold shrink-0 hover:opacity-95 transition active:scale-95"
                  >
                    + Cook Batch
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {idea.vitamins.map((v) => (
                    <span
                      key={v}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-[#64D2FF]/12 text-[#64D2FF]"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
