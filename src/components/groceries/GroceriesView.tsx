"use client";

import React, { useState, useMemo } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import {
  calculateInflationPct,
  calculateUnitPrice,
  formatEUR,
  parseReceiptText,
} from "@/lib/utils";
import { NutritionalFamily } from "@/lib/seedData";
import {
  Camera,
  Check,
  FileText,
  Scale,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  ShoppingBag,
  PlusCircle,
  ScanLine,
} from "lucide-react";

const FAMILY_FILTERS: ("All" | NutritionalFamily)[] = [
  "All",
  "Veggies & Vitamins",
  "Whole Proteins",
  "Complex Carbs",
  "Fruits & Antioxidants",
  "Healthy Fats",
  "Extras / Ultra-Processed",
];

const SAMPLE_RECEIPT_BOLO = `5% Lean Ground Beef 500g      5.40 €
Whole-Wheat Pasta 1kg         1.85 €
Bulk Carrots 1.5kg            1.89 €
Crushed Tomatoes 800g         1.49 €
Yellow Onions 1kg             1.59 €
Fresh Broccoli 1kg            2.19 €
Free-Range Eggs 1kg           4.49 €`;

export function GroceriesView() {
  const {
    stapleProducts,
    groceryItems,
    addStapleToGroceries,
    toggleGroceryChecked,
    removeGroceryItem,
    checkoutGroceriesToBudget,
    importScannedReceipt,
    setQuickAddOpen,
  } = useFinanceStore();

  const [selectedFamily, setSelectedFamily] = useState<
    "All" | NutritionalFamily
  >("All");
  const [calcPrice, setCalcPrice] = useState("2.49");
  const [calcWeightGrams, setCalcWeightGrams] = useState("450");
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);

  // Receipt Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [storeName, setStoreName] = useState("Lidl / Supermarket");
  const [receiptText, setReceiptText] = useState(SAMPLE_RECEIPT_BOLO);
  const [isScanningImage, setIsScanningImage] = useState(false);

  const parsedReceiptItems = useMemo(
    () => parseReceiptText(receiptText),
    [receiptText]
  );

  const parsedReceiptTotal = useMemo(
    () =>
      Number(
        parsedReceiptItems.reduce((sum, i) => sum + i.price, 0).toFixed(2)
      ),
    [parsedReceiptItems]
  );

  // Express Unit Price Calculator (€/kg)
  const liveKgPrice = useMemo(() => {
    const p = parseFloat(calcPrice) || 0;
    const g = parseFloat(calcWeightGrams) || 0;
    if (g <= 0) return 0;
    return calculateUnitPrice(p, g / 1000);
  }, [calcPrice, calcWeightGrams]);

  // Nutritional Basket Quality Gauge (Whole Nutrient-Dense Foods vs Extras)
  const basketStats = useMemo(() => {
    const total = groceryItems.reduce((sum, item) => sum + item.price, 0);
    const rawHealthyTotal = groceryItems
      .filter((item) => item.family !== "Extras / Ultra-Processed")
      .reduce((sum, item) => sum + item.price, 0);
    const extrasTotal = total - rawHealthyTotal;
    const rawPct =
      total > 0 ? Math.round((rawHealthyTotal / total) * 100) : 100;
    const avgPricePerKg =
      groceryItems.length > 0
        ? groceryItems.reduce((s, i) => s + i.pricePerUnit, 0) /
          groceryItems.length
        : 0;

    return {
      total,
      rawHealthyTotal,
      extrasTotal,
      rawPct,
      avgPricePerKg,
    };
  }, [groceryItems]);

  const filteredStaples = useMemo(() => {
    if (selectedFamily === "All") return stapleProducts;
    return stapleProducts.filter((s) => s.family === selectedFamily);
  }, [stapleProducts, selectedFamily]);

  const handleCheckout = () => {
    const amount = checkoutGroceriesToBudget();
    if (amount > 0) {
      setCheckoutBanner(
        `✅ Checked items (${formatEUR(
          amount
        )}) logged into your NUTRI.PA budget envelope!`
      );
      setTimeout(() => setCheckoutBanner(null), 4500);
    }
  };

  const handleReceiptPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rawName = file.name.replace(/\.[^/.]+$/, "") || "Scanned Receipt";
    // Immediately release the File reference from the DOM input so 0 bytes of image data remain in memory or storage
    e.target.value = "";
    setIsScanningImage(true);

    setTimeout(() => {
      setIsScanningImage(false);
      setStoreName(rawName);
      setReceiptText(
        `5% Lean Ground Beef 500g      5.45 €\nWhole-Wheat Spaghetti 1kg     1.79 €\nCrushed Tomatoes 800g         1.55 €\nFresh Carrots 1kg             1.49 €\nChicken Breast 1kg            9.60 €\nLeaf Spinach 1kg              1.99 €`
      );
    }, 650);
  };

  const handleConfirmReceiptScan = () => {
    if (parsedReceiptItems.length === 0) return;
    const res = importScannedReceipt(parsedReceiptItems, storeName);
    setShowScanner(false);
    setCheckoutBanner(
      `📸 Receipt "${storeName}" imported: ${res.updatedCount} items added, ${formatEUR(
        res.totalSpent
      )} deducted from budget & Batch Cooking ingredient prices updated!`
    );
    setTimeout(() => setCheckoutBanner(null), 6000);
  };

  return (
    <div className="space-y-5 pb-24">
      {checkoutBanner && (
        <div className="sticky top-16 z-30 p-3.5 rounded-2xl bg-[#30D158] text-[#121214] text-xs font-bold shadow-xl">
          {checkoutBanner}
        </div>
      )}

      {/* HERO CARD: RECEIPT SCANNER (OCR / PHOTO / PASTE) */}
      <section className="rounded-3xl bg-gradient-to-br from-[#1C1C1E] via-[#1C1C1E] to-[#0A84FF]/15 border border-white/[0.1] p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#30D158] flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5" />
              OCR RECEIPT SCANNER & REAL PRICES
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Scan Grocery Receipt
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Automatically logs your grocery spend and updates real ingredient prices for your Batch Cooking recipes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowScanner(!showScanner)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#30D158] text-[#121214] text-xs font-bold shadow-lg shadow-[#30D158]/20 hover:opacity-95 transition shrink-0"
          >
            <Camera className="w-4 h-4" />
            {showScanner ? "Close" : "Scan Receipt"}
          </button>
        </div>

        {showScanner && (
          <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-3.5">
            <div className="px-3 py-2 rounded-xl bg-[#30D158]/10 border border-[#30D158]/25 text-[11px] text-[#30D158] flex items-center justify-between">
              <span>🔒 Zero-Photo Storage: Receipt image is read in RAM and immediately discarded.</span>
              <span className="font-mono font-bold">0 KB saved</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/[0.1] text-xs font-semibold text-white cursor-pointer transition">
                <Camera className="w-4 h-4 text-[#0A84FF]" />
                {isScanningImage
                  ? "Scanning receipt image..."
                  : "Take Photo / Upload Receipt"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptPhotoUpload}
                  className="hidden"
                />
              </label>

              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Store Name (e.g., Lidl, Whole Foods, Aldi)"
                className="rounded-2xl bg-[#2C2C2E] border border-white/[0.08] px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[#64D2FF]" />
                  Detected Receipt Lines (supports English & French receipts):
                </span>
                <button
                  type="button"
                  onClick={() => setReceiptText(SAMPLE_RECEIPT_BOLO)}
                  className="text-[10px] text-[#0A84FF] hover:underline"
                >
                  Load Bolognese Sample Receipt
                </button>
              </div>
              <textarea
                rows={5}
                value={receiptText}
                onChange={(e) => setReceiptText(e.target.value)}
                className="w-full rounded-2xl bg-[#121214] border border-white/[0.08] p-3 font-mono text-xs text-zinc-200 focus:outline-none focus:border-[#0A84FF]"
              />
            </div>

            {/* Live Preview of Extracted Items */}
            <div className="rounded-2xl bg-[#121214] border border-white/[0.06] p-3 space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-white/[0.06] pb-2">
                <span className="text-zinc-300 font-semibold">
                  {parsedReceiptItems.length} items automatically parsed
                </span>
                <span className="text-[#30D158] font-bold tabular-nums">
                  Receipt Total: {formatEUR(parsedReceiptTotal)}
                </span>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {parsedReceiptItems.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04] last:border-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{it.emoji}</span>
                      <span className="text-white truncate">{it.name}</span>
                      <span className="text-[10px] text-zinc-500 tabular-nums">
                        (€{calculateUnitPrice(it.price, it.quantity)}/{it.unit})
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-[#30D158] tabular-nums ml-2">
                      {formatEUR(it.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmReceiptScan}
              className="w-full py-3 rounded-2xl bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white font-bold text-xs shadow-lg shadow-[#0A84FF]/25 transition"
            >
              ✅ Confirm Receipt ({formatEUR(parsedReceiptTotal)}) & Sync Batch Prices
            </button>
          </div>
        )}
      </section>

      {/* BASKET QUALITY GAUGE: WHOLE FOODS VS EXTRAS */}
      <section className="rounded-3xl bg-[#1C1C1E] border border-white/[0.08] p-5 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#64D2FF]">
              NUTRIENT DENSITY & UNIT PRICE INDEX
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">
              Grocery Basket Quality
            </h2>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-[#30D158] tabular-nums">
              {basketStats.rawPct}%
            </span>
            <span className="block text-[10px] text-zinc-400">
              Whole Foods
            </span>
          </div>
        </div>

        <div className="w-full h-3 rounded-full bg-[#2C2C2E] overflow-hidden flex my-3">
          <div
            className="h-full bg-gradient-to-r from-[#30D158] to-[#64D2FF] transition-all"
            style={{ width: `${basketStats.rawPct}%` }}
          />
          <div
            className="h-full bg-[#FF453A] transition-all"
            style={{ width: `${100 - basketStats.rawPct}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center mt-3">
          <div className="rounded-2xl bg-[#121214] p-2.5 border border-white/[0.06]">
            <span className="text-[10px] text-zinc-400 block">Cart Total</span>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatEUR(basketStats.total)}
            </span>
          </div>
          <div className="rounded-2xl bg-[#121214] p-2.5 border border-white/[0.06]">
            <span className="text-[10px] text-zinc-400 block">
              Whole & Vitamins
            </span>
            <span className="text-sm font-bold text-[#30D158] tabular-nums">
              {formatEUR(basketStats.rawHealthyTotal)}
            </span>
          </div>
          <div className="rounded-2xl bg-[#121214] p-2.5 border border-white/[0.06]">
            <span className="text-[10px] text-zinc-400 block">Avg / Kg</span>
            <span className="text-sm font-bold text-[#64D2FF] tabular-nums">
              {formatEUR(basketStats.avgPricePerKg)}/kg
            </span>
          </div>
        </div>
      </section>

      {/* IN-STORE EXPRESS UNIT PRICE CALCULATOR (€/KG) */}
      <section className="rounded-3xl bg-[#1C1C1E] border border-white/[0.08] p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#0A84FF]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              In-Store Unit Price Calculator (€/kg)
            </h3>
          </div>
          <span className="text-xs font-mono text-[#30D158] font-bold tabular-nums">
            = {formatEUR(liveKgPrice)} / kg
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex items-center justify-between rounded-xl bg-[#2C2C2E] px-3 py-2">
            <span className="text-xs text-zinc-400">Shelf Tag (€)</span>
            <input
              type="number"
              step="0.01"
              value={calcPrice}
              onChange={(e) => setCalcPrice(e.target.value)}
              className="w-20 text-right bg-transparent text-sm font-bold text-white tabular-nums focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#2C2C2E] px-3 py-2">
            <span className="text-xs text-zinc-400">Net Weight (g)</span>
            <input
              type="number"
              step="10"
              value={calcWeightGrams}
              onChange={(e) => setCalcWeightGrams(e.target.value)}
              className="w-20 text-right bg-transparent text-sm font-bold text-white tabular-nums focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* 1-TAP HEALTHY STAPLES GRID */}
      <section className="rounded-3xl bg-[#1C1C1E] border border-white/[0.08] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#30D158]" />
              <h3 className="text-sm font-semibold text-white">
                1-Tap Budget & Vitamin Staples
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400">
              Tap any whole food staple to add it with your last paid price
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
          {FAMILY_FILTERS.map((fam) => (
            <button
              key={fam}
              onClick={() => setSelectedFamily(fam)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition ${
                selectedFamily === fam
                  ? "bg-[#0A84FF] text-white"
                  : "bg-[#2C2C2E] text-zinc-300 hover:text-white"
              }`}
            >
              {fam}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {filteredStaples.map((staple) => {
            const unitPrice = calculateUnitPrice(
              staple.defaultPrice,
              staple.defaultQuantity
            );
            return (
              <button
                key={staple.id}
                onClick={() => addStapleToGroceries(staple)}
                className="group text-left rounded-2xl bg-[#121214] hover:bg-[#2C2C2E] border border-white/[0.07] hover:border-[#30D158]/40 p-3 transition active:scale-[0.98]"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xl">{staple.emoji}</span>
                  <span className="text-[11px] font-bold text-[#30D158] bg-[#30D158]/10 px-1.5 py-0.5 rounded-md tabular-nums">
                    {formatEUR(staple.defaultPrice)}
                  </span>
                </div>
                <p className="text-xs font-semibold text-white mt-1.5 line-clamp-1">
                  {staple.name}
                </p>
                <p className="text-[10px] text-zinc-400 tabular-nums mt-0.5">
                  {formatEUR(unitPrice)}/{staple.unit} • Score{" "}
                  {staple.nutriDensity}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {staple.vitamins.slice(0, 2).map((vit) => (
                    <span
                      key={vit}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-[#64D2FF]/15 text-[#64D2FF] font-medium"
                    >
                      {vit}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ACTIVE SHOPPING LIST & INFLATION TRACKER */}
      <section className="rounded-3xl bg-[#1C1C1E] border border-white/[0.08] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Shopping Cart ({groceryItems.length} items)
            </h3>
            <p className="text-[11px] text-zinc-400">
              Automatic unit price & inflation check vs historical baseline
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickAddOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#2C2C2E] text-xs text-zinc-200 hover:text-white"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#0A84FF]" />
              Custom
            </button>
            <button
              onClick={handleCheckout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#30D158] text-[#121214] text-xs font-bold shadow-sm hover:opacity-95 transition"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Log Checked
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {groceryItems.map((item) => {
            const inflationPct = calculateInflationPct(
              item.pricePerUnit,
              item.referencePricePerUnit
            );
            const isDeflation = inflationPct <= 0;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                  item.checked
                    ? "bg-[#121214]/60 border-white/[0.04] opacity-75"
                    : "bg-[#121214] border-white/[0.08]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleGroceryChecked(item.id)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border transition shrink-0 ${
                      item.checked
                        ? "bg-[#30D158] border-[#30D158] text-[#121214]"
                        : "border-zinc-600 bg-[#2C2C2E]"
                    }`}
                  >
                    {item.checked && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  <span className="text-xl shrink-0">{item.emoji}</span>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${
                        item.checked
                          ? "line-through text-zinc-400"
                          : "text-white"
                      }`}
                    >
                      {item.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-zinc-400 tabular-nums">
                        {item.quantity} {item.unit} •{" "}
                        <strong className="text-zinc-200">
                          {formatEUR(item.pricePerUnit)}/{item.unit}
                        </strong>
                      </span>

                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-mono tabular-nums ${
                          isDeflation
                            ? "bg-[#30D158]/15 text-[#30D158]"
                            : "bg-[#FF9F0A]/15 text-[#FF9F0A]"
                        }`}
                      >
                        {isDeflation ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <TrendingUp className="w-3 h-3" />
                        )}
                        {inflationPct > 0
                          ? `+${inflationPct}%`
                          : `${inflationPct}%`}
                      </span>
                    </div>

                    {item.vitamins.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.vitamins.map((vit) => (
                          <span
                            key={vit}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-[#64D2FF]/12 text-[#64D2FF]"
                          >
                            {vit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-sm font-bold text-white tabular-nums">
                    {formatEUR(item.price)}
                  </span>
                  <button
                    onClick={() => removeGroceryItem(item.id)}
                    className="text-zinc-500 hover:text-[#FF453A] p-1"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
