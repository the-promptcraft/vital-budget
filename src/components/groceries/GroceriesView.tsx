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
  RotateCcw,
} from "lucide-react";

const FAMILY_FILTERS: { key: "All" | NutritionalFamily; label: string }[] = [
  { key: "All", label: "Tous" },
  { key: "Veggies & Vitamins", label: "Légumes & Vitamines" },
  { key: "Whole Proteins", label: "Protéines Brutes" },
  { key: "Complex Carbs", label: "Glucides Complexes" },
  { key: "Fruits & Antioxidants", label: "Fruits" },
  { key: "Healthy Fats", label: "Bons Lipides" },
  { key: "Extras / Ultra-Processed", label: "Extras" },
];

const SAMPLE_RECEIPT_FR = `Filets de Poulet 1kg          9,80 €
Pâtes Complètes 1kg           1,85 €
Carottes Vrac 1.5kg           1,89 €
Tomates Concassées 800g       1,49 €
Oignons Jaunes 1kg            1,59 €
Brocoli Frais 1kg             2,19 €
Œufs Plein Air x12            3,60 €`;

/**
 * Preprocesses a receipt photo on an HTML5 Canvas (upscales + high-contrast grayscale)
 * so thermal supermarket receipt fonts are read accurately by Tesseract OCR.
 */
async function preprocessReceiptImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const maxDim = 1800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(objectUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // High-contrast grayscale enhancement for thermal receipt paper
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const contrasted = lum < 155 ? Math.max(0, (lum - 40) * 0.7) : 255;
          data[i] = contrasted;
          data[i + 1] = contrasted;
          data[i + 2] = contrasted;
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
}

export function GroceriesView() {
  const {
    stapleProducts,
    groceryItems,
    addStapleToGroceries,
    toggleGroceryChecked,
    removeGroceryItem,
    checkoutGroceriesToBudget,
    importScannedReceipt,
    resetGroceriesOnly,
    setQuickAddOpen,
  } = useFinanceStore();

  const [selectedFamily, setSelectedFamily] = useState<
    "All" | NutritionalFamily
  >("All");
  const [calcPrice, setCalcPrice] = useState("2.49");
  const [calcWeightGrams, setCalcWeightGrams] = useState("450");
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);

  // Real OCR Receipt Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [storeName, setStoreName] = useState("Supermarché / Courses");
  const [receiptText, setReceiptText] = useState(SAMPLE_RECEIPT_FR);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrStatusText, setOcrStatusText] = useState<string | null>(null);

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

  const liveKgPrice = useMemo(() => {
    const p = parseFloat(calcPrice) || 0;
    const g = parseFloat(calcWeightGrams) || 0;
    if (g <= 0) return 0;
    return calculateUnitPrice(p, g / 1000);
  }, [calcPrice, calcWeightGrams]);

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
        `✅ Articles cochés (${formatEUR(
          amount
        )}) déduits de ton enveloppe Courses & Alimentation !`
      );
      setTimeout(() => setCheckoutBanner(null), 4500);
    }
  };

  const handleReceiptPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rawName =
      file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") ||
      "Ticket Scanné";
    e.target.value = "";

    setIsScanningImage(true);
    setOcrProgress(8);
    setOcrStatusText("Amélioration du contraste de la photo...");

    try {
      const processedDataUrl = await preprocessReceiptImage(file);
      setOcrProgress(20);
      setOcrStatusText("Lecture optique des lignes et prix (OCR 100% gratuit)...");

      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.recognize(processedDataUrl, "fra+eng", {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setOcrProgress(20 + Math.round(m.progress * 78));
          }
        },
      });

      const rawExtracted = (result?.data?.text || "").trim();
      setIsScanningImage(false);
      setOcrProgress(100);

      if (rawExtracted.length > 5) {
        setStoreName(rawName);
        setReceiptText(rawExtracted);
        const itemsFound = parseReceiptText(rawExtracted);
        if (itemsFound.length > 0) {
          setOcrStatusText(
            `✅ ${itemsFound.length} articles détectés sur ta photo ! Vérifie ou modifie les lignes ci-dessous avant de valider.`
          );
        } else {
          setOcrStatusText(
            "⚠️ Texte lu sur la photo, mais certains prix étaient flous. Vérifie ou ajuste les prix au bout des lignes ci-dessous (ex: Produit 2,50 €)."
          );
        }
      } else {
        setOcrStatusText(
          "⚠️ La photo était trop floue ou sombre. Prends la photo bien à plat avec de la lumière ou saisis les lignes ci-dessous."
        );
      }
    } catch {
      setIsScanningImage(false);
      setOcrStatusText(
        "⚠️ Impossible de lire cette image. Tu peux réessayer ou coller/modifier les lignes directement ci-dessous."
      );
    }
  };

  const handleConfirmReceiptScan = () => {
    if (parsedReceiptItems.length === 0) return;
    const res = importScannedReceipt(parsedReceiptItems, storeName);
    setShowScanner(false);
    setCheckoutBanner(
      `📸 Ticket « ${storeName} » importé : ${res.updatedCount} articles ajoutés et ${formatEUR(
        res.totalSpent
      )} déduits de ton budget !`
    );
    setTimeout(() => setCheckoutBanner(null), 6000);
  };

  return (
    <div className="space-y-5 pb-32">
      {checkoutBanner && (
        <div className="sticky top-16 z-30 p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-xl">
          {checkoutBanner}
        </div>
      )}

      {/* HERO CARD: REAL OCR RECEIPT SCANNER (100% FREE TESSERACT OCR) */}
      <section className="apple-titanium-card rounded-[30px] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0071E3] flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5" />
              SCANNER OPTIQUE DE TICKET (OCR 0,00 €)
            </span>
            <h2 className="text-lg font-extrabold text-[#0F172A] mt-0.5">
              Scanner un Ticket de Caisse
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Prends en photo ton ticket de supermarché : l&apos;OCR lit les
              vrais articles et déduit le total de ton budget.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowScanner(!showScanner)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#0071E3] text-white text-xs font-bold shadow-md shadow-[#0071E3]/25 hover:bg-[#0077ED] transition shrink-0"
          >
            <Camera className="w-4 h-4" />
            {showScanner ? "Fermer" : "Scanner Ticket"}
          </button>
        </div>

        {showScanner && (
          <div className="mt-4 pt-4 border-t border-slate-200/70 space-y-3.5">
            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 flex items-center justify-between">
              <span>
                🔒 Lecture optique locale sur ton téléphone (0,00 € • 0 photo
                stockée sur serveur).
              </span>
              <span className="font-mono font-bold">OCR Français</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-[#0071E3]/10 hover:bg-[#0071E3]/15 border border-[#0071E3]/25 text-xs font-bold text-[#0071E3] cursor-pointer transition">
                <Camera className="w-4 h-4" />
                {isScanningImage
                  ? `Lecture optique en cours (${ocrProgress}%)...`
                  : "📸 Prendre une Photo / Choisir Ticket"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptPhotoUpload}
                  className="hidden"
                />
              </label>

              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Magasin (ex: Lidl, Carrefour, Leclerc)"
                className="rounded-2xl bg-white border border-slate-200 px-3.5 py-2.5 text-xs text-[#0F172A] font-medium"
              />
            </div>

            {isScanningImage && (
              <div className="space-y-1.5">
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-[#0071E3] transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#0071E3] font-semibold">
                  {ocrStatusText}
                </p>
              </div>
            )}

            {!isScanningImage && ocrStatusText && (
              <p className="text-[11px] font-semibold text-[#0F172A] bg-white/80 p-2.5 rounded-xl border border-slate-200">
                {ocrStatusText}
              </p>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[#0071E3]" />
                  Lignes lues sur le ticket (tu peux corriger ou ajouter une
                  ligne) :
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReceiptText("")}
                    className="text-[10px] text-red-600 font-semibold hover:underline"
                  >
                    Vider texte
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptText(SAMPLE_RECEIPT_FR)}
                    className="text-[10px] text-[#0071E3] font-semibold hover:underline"
                  >
                    Exemple
                  </button>
                </div>
              </div>
              <textarea
                rows={5}
                value={receiptText}
                onChange={(e) => setReceiptText(e.target.value)}
                placeholder="Exemple : Poulet 1kg 9,80 €"
                className="w-full rounded-2xl bg-white border border-slate-200 p-3 font-mono text-xs text-[#0F172A] focus:outline-none focus:border-[#0071E3]"
              />
            </div>

            {/* Live Preview of Extracted Items */}
            <div className="rounded-2xl bg-white/90 border border-slate-200/80 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                <span className="text-[#0F172A] font-bold">
                  {parsedReceiptItems.length} articles détectés
                </span>
                <span className="text-emerald-600 font-extrabold tabular-nums">
                  Total : {formatEUR(parsedReceiptTotal)}
                </span>
              </div>

              {parsedReceiptItems.length === 0 ? (
                <p className="text-[11px] text-[#64748B] py-2">
                  Écris chaque article avec son prix en fin de ligne (ex:{" "}
                  <code>Poulet 1kg 9,80</code>).
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {parsedReceiptItems.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{it.emoji}</span>
                        <span className="text-[#0F172A] font-medium truncate">
                          {it.name}
                        </span>
                        <span className="text-[10px] text-[#64748B] tabular-nums">
                          ({formatEUR(calculateUnitPrice(it.price, it.quantity))}
                          /{it.unit})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 tabular-nums ml-2">
                        {formatEUR(it.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={parsedReceiptItems.length === 0}
              onClick={handleConfirmReceiptScan}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition"
            >
              ✅ Valider le Ticket ({formatEUR(parsedReceiptTotal)}) & Déduire
              du Budget
            </button>
          </div>
        )}
      </section>

      {/* ACTIVE SHOPPING LIST & PHYSICAL RESET */}
      <section className="apple-glass rounded-[30px] p-5">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div>
            <h3 className="text-sm font-extrabold text-[#0F172A]">
              Panier de Courses ({groceryItems.length} articles)
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Coche tes articles achetés ou réinitialise la liste
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={resetGroceriesOnly}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-[11px] font-bold text-red-600 transition-colors"
              title="Vider toute la liste de courses"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Courses</span>
            </button>

            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-[#0F172A]"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#0071E3]" />
              <span>Ajouter</span>
            </button>

            <button
              type="button"
              onClick={handleCheckout}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-sm hover:bg-emerald-700 transition"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Encaisser cochés</span>
            </button>
          </div>
        </div>

        {groceryItems.length === 0 ? (
          <p className="text-xs text-[#64748B] text-center py-6">
            Ta liste de courses est vide. Demande à Kora Chef ou touche un
            produit ci-dessous !
          </p>
        ) : (
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
                      ? "bg-white/50 border-slate-200/50 opacity-70"
                      : "bg-white/90 border-white shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleGroceryChecked(item.id)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition shrink-0 ${
                        item.checked
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {item.checked && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <span className="text-xl shrink-0">{item.emoji}</span>

                    <div className="min-w-0">
                      <p
                        className={`text-xs font-bold truncate ${
                          item.checked
                            ? "line-through text-[#64748B]"
                            : "text-[#0F172A]"
                        }`}
                      >
                        {item.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-[#64748B] tabular-nums">
                          {item.quantity} {item.unit} •{" "}
                          <strong className="text-[#0F172A]">
                            {formatEUR(item.pricePerUnit)}/{item.unit}
                          </strong>
                        </span>

                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-mono tabular-nums ${
                            isDeflation
                              ? "bg-emerald-500/10 text-emerald-700"
                              : "bg-amber-500/10 text-amber-700"
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
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-sm font-extrabold text-[#0F172A] tabular-nums">
                      {formatEUR(item.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeGroceryItem(item.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* BASKET QUALITY GAUGE: WHOLE FOODS VS EXTRAS */}
      <section className="apple-glass rounded-[30px] p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0071E3]">
              DENSITÉ NUTRITIONNELLE & PRIX AU KILO
            </span>
            <h2 className="text-base font-extrabold text-[#0F172A] mt-0.5">
              Qualité du Panier
            </h2>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-emerald-600 tabular-nums">
              {basketStats.rawPct}%
            </span>
            <span className="block text-[10px] text-[#64748B]">
              Aliments Bruts
            </span>
          </div>
        </div>

        <div className="w-full h-3 rounded-full bg-slate-200/70 overflow-hidden flex my-3">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-[#0071E3] transition-all"
            style={{ width: `${basketStats.rawPct}%` }}
          />
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${100 - basketStats.rawPct}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center mt-3">
          <div className="rounded-2xl bg-white/85 p-2.5 border border-white">
            <span className="text-[10px] text-[#64748B] block">
              Total Panier
            </span>
            <span className="text-sm font-bold text-[#0F172A] tabular-nums">
              {formatEUR(basketStats.total)}
            </span>
          </div>
          <div className="rounded-2xl bg-white/85 p-2.5 border border-white">
            <span className="text-[10px] text-[#64748B] block">
              Bruts & Vitamines
            </span>
            <span className="text-sm font-bold text-emerald-600 tabular-nums">
              {formatEUR(basketStats.rawHealthyTotal)}
            </span>
          </div>
          <div className="rounded-2xl bg-white/85 p-2.5 border border-white">
            <span className="text-[10px] text-[#64748B] block">
              Moyenne / Kg
            </span>
            <span className="text-sm font-bold text-[#0071E3] tabular-nums">
              {formatEUR(basketStats.avgPricePerKg)}/kg
            </span>
          </div>
        </div>
      </section>

      {/* IN-STORE EXPRESS UNIT PRICE CALCULATOR (€/KG) */}
      <section className="apple-glass rounded-[30px] p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#0071E3]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Calculateur Express Prix au Kilo (€/kg)
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-600 font-extrabold tabular-nums">
            = {formatEUR(liveKgPrice)} / kg
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex items-center justify-between rounded-xl bg-white/85 border border-white px-3 py-2">
            <span className="text-xs text-[#64748B]">Prix affiché (€)</span>
            <input
              type="number"
              step="0.01"
              value={calcPrice}
              onChange={(e) => setCalcPrice(e.target.value)}
              className="w-20 text-right bg-transparent text-sm font-bold text-[#0F172A] tabular-nums focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/85 border border-white px-3 py-2">
            <span className="text-xs text-[#64748B]">Poids (g)</span>
            <input
              type="number"
              step="10"
              value={calcWeightGrams}
              onChange={(e) => setCalcWeightGrams(e.target.value)}
              className="w-20 text-right bg-transparent text-sm font-bold text-[#0F172A] tabular-nums focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* 1-TAP HEALTHY STAPLES GRID */}
      <section className="apple-glass rounded-[30px] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-extrabold text-[#0F172A]">
                Produits Essentiels en 1-Tap
              </h3>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Touche un aliment brut pour l&apos;ajouter à ton panier
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
          {FAMILY_FILTERS.map((fam) => (
            <button
              key={fam.key}
              type="button"
              onClick={() => setSelectedFamily(fam.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition ${
                selectedFamily === fam.key
                  ? "bg-[#0071E3] text-white"
                  : "bg-white/80 text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              {fam.label}
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
                type="button"
                onClick={() => addStapleToGroceries(staple)}
                className="group text-left rounded-2xl bg-white/85 hover:bg-white border border-white hover:border-[#0071E3]/30 p-3 transition active:scale-[0.98] shadow-2xs"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xl">{staple.emoji}</span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-500/10 px-1.5 py-0.5 rounded-md tabular-nums">
                    {formatEUR(staple.defaultPrice)}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#0F172A] mt-1.5 line-clamp-1">
                  {staple.name}
                </p>
                <p className="text-[10px] text-[#64748B] tabular-nums mt-0.5">
                  {formatEUR(unitPrice)}/{staple.unit} • Score{" "}
                  {staple.nutriDensity}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
