"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatEUR } from "@/lib/utils";
import {
  Utensils,
  Sparkles,
  ChevronDown,
  Smartphone,
  Share,
  PlusSquare,
  Lock,
  X,
} from "lucide-react";

const ISLAND_SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 30,
  mass: 0.75,
};

export function Header() {
  const {
    batchMeals,
    monthlyIncome,
    savingsTarget,
    envelopes,
    fixedExpenses,
    currentMonthLabel,
    setActiveTab,
  } = useFinanceStore();

  const [islandExpanded, setIslandExpanded] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  const totalFridgePortions = batchMeals.reduce(
    (sum, m) => sum + m.remainingPortions,
    0
  );

  const dailyBudgetAllowed = useMemo(() => {
    const totalFixed = fixedExpenses.reduce((s, f) => s + f.amount, 0);
    const totalVar = envelopes.reduce((s, e) => s + e.spent, 0);
    const left = monthlyIncome - totalFixed - savingsTarget - totalVar;
    return Number((left / 13).toFixed(2));
  }, [monthlyIncome, fixedExpenses, savingsTarget, envelopes]);

  return (
    <>
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-white/75 border-b border-white/90 shadow-[0_4px_24px_rgba(15,23,42,0.035)] px-4 pb-2.5 pt-[max(0.65rem,env(safe-area-inset-top))]">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          {/* Kora Brand Emblem */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => setActiveTab("stocks")}
            className="flex items-center gap-2.5 text-left group shrink-0"
          >
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
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-[-0.03em] text-[#0F172A] leading-none">
                  Kora
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-[#0F172A]/[0.06] text-[9px] font-bold uppercase tracking-widest text-[#475569]">
                  OS
                </span>
              </div>
              <span className="text-[10px] text-[#64748B] font-medium block mt-0.5">
                {currentMonthLabel}
              </span>
            </div>
          </motion.button>

          <div className="flex items-center gap-1.5">
            {/* iPhone Native App Install Guide Button */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="apple-glass-pill px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-[#0F172A] flex items-center gap-1 shadow-xs"
              title="Installer Kora comme vraie application sur ton iPhone"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#0071E3]" />
              <span className="hidden xs:inline">App iPhone</span>
            </motion.button>

            {/* Interactive Apple Dynamic Island Status Pill */}
            <motion.div layout transition={ISLAND_SPRING} className="relative">
              <motion.button
                layout
                whileTap={{ scale: 0.95 }}
                transition={ISLAND_SPRING}
                type="button"
                onClick={() => setIslandExpanded(!islandExpanded)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F172A] text-white shadow-lg shadow-[#0F172A]/15 border border-white/15"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-semibold tabular-nums">
                  {formatEUR(dailyBudgetAllowed)}/j
                </span>
                <span className="text-white/25">•</span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-300 font-medium tabular-nums">
                  <Utensils className="w-3 h-3" />
                  {totalFridgePortions}
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-white/60 transition-transform duration-300 ${
                    islandExpanded ? "rotate-180" : ""
                  }`}
                />
              </motion.button>

              <AnimatePresence>
                {islandExpanded && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.92 }}
                    transition={ISLAND_SPRING}
                    className="absolute right-0 mt-2 w-68 p-3.5 rounded-3xl bg-[#0F172A]/95 backdrop-blur-2xl text-white shadow-2xl border border-white/15 space-y-2.5 z-50"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#60A5FA]" />
                        <span>Cadence du jour</span>
                      </span>
                      <span className="font-bold text-emerald-400 tabular-nums">
                        {formatEUR(dailyBudgetAllowed)} / jour
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Stock Batch Frigo</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIslandExpanded(false);
                          setActiveTab("batch");
                        }}
                        className="font-bold text-white underline tabular-nums"
                      >
                        {totalFridgePortions} boîtes prêtes →
                      </button>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        <span>100% privé sur cet appareil</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIslandExpanded(false);
                          setShowInstallModal(true);
                        }}
                        className="text-[#60A5FA] font-semibold hover:underline"
                      >
                        Installer sur iPhone
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </header>

      {/* iPhone Native PWA & Privacy Sheet Modal */}
      <AnimatePresence>
        {showInstallModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstallModal(false)}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={ISLAND_SPRING}
              className="fixed inset-x-4 top-20 z-50 max-w-md mx-auto apple-titanium-card rounded-[30px] p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#0071E3] text-white flex items-center justify-center font-extrabold text-lg shadow-md">
                    K
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Installer Kora sur ton iPhone
                    </h3>
                    <p className="text-[11px] text-[#64748B]">
                      Plein écran • Dynamic Island • 100% Privé
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-900/[0.05] flex items-center justify-center text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-[#0F172A]">
                <div className="p-3 rounded-2xl bg-white/85 border border-white flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0 mt-0.5">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold">1. Ouvre ce lien dans Safari sur ton iPhone</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Appuie sur l&apos;icône <strong>Partager</strong> (le carré avec la flèche vers le haut en bas de Safari).
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/85 border border-white flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold">
                      2. Choisis « Sur l&apos;écran d&apos;accueil »
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      L&apos;icône officielle <strong>Kora</strong> apparaît sur ton iPhone. Quand tu l&apos;ouvres, il n&apos;y a plus aucune barre Safari et le haut fusionne avec ta <strong>Dynamic Island</strong> !
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/60 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-950">
                      Tes données restent 100% privées sur ton téléphone
                    </p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Même si le site est en ligne, tes comptes, ton solde et tes boîtes Batch sont stockés <strong>uniquement dans la mémoire privée de ton iPhone</strong>. Personne d&apos;autre sur Internet ne peut voir tes chiffres.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
