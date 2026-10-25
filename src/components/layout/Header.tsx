"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinanceStore } from "@/store/useFinanceStore";
import { getCurrentFrenchMonthLabel } from "@/lib/utils";
import {
  RotateCcw,
  Smartphone,
  Share,
  PlusSquare,
  Lock,
  X,
  Check,
  Sparkles,
} from "lucide-react";

const APPLE_SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

export function Header() {
  const {
    currentMonthLabel,
    setActiveTab,
    clearAllDemoData,
    startNewMonth,
    resetToSeedData,
  } = useFinanceStore();

  const [showResetSheet, setShowResetSheet] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [resetToast, setResetToast] = useState<string | null>(null);

  const triggerResetFeedback = (msg: string) => {
    setResetToast(msg);
    setShowResetSheet(false);
    setTimeout(() => setResetToast(null), 3200);
  };

  const handleFullZeroReset = () => {
    clearAllDemoData();
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      localStorage.setItem(
        "vital_agent_daily_count_v1",
        JSON.stringify({ date: todayStr, count: 0 })
      );
    } catch {}
    triggerResetFeedback("Tout a été remis à 0,00 € pour ce mois !");
  };

  const handleNewMonthRestart = () => {
    const label = getCurrentFrenchMonthLabel();
    startNewMonth(label);
    triggerResetFeedback(`Nouveau mois démarré (${label}) !`);
  };

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-white/80 border-b border-white/90 shadow-[0_4px_24px_rgba(15,23,42,0.04)] px-4 pb-2.5 pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.35rem))]">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          {/* Left: Kora Brand Emblem */}
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

          {/* Right: Physical Master RESET Button & iPhone Guide */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={() => setShowResetSheet(true)}
              className="px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-600 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              title="Remettre tout à zéro ou démarrer un nouveau mois"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="apple-glass-pill px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-[#0F172A] flex items-center gap-1 shadow-2xs"
              title="Guide iPhone"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#0071E3]" />
              <span className="hidden xs:inline">iPhone</span>
            </motion.button>
          </div>
        </div>

        {/* Reset Feedback Banner */}
        <AnimatePresence>
          {resetToast && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="max-w-lg mx-auto mt-2 px-3.5 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>{resetToast}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Master Physical RESET Modal Sheet */}
      <AnimatePresence>
        {showResetSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetSheet(false)}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={APPLE_SPRING}
              className="fixed inset-x-4 top-20 z-50 max-w-md mx-auto apple-titanium-card rounded-[30px] p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-red-600">
                    Contrôle Mensuel & Remise à Zéro
                  </span>
                  <h3 className="text-base font-extrabold text-[#0F172A] mt-0.5">
                    Que souhaites-tu réinitialiser ?
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetSheet(false)}
                  className="w-8 h-8 rounded-full bg-slate-900/[0.05] flex items-center justify-center text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleFullZeroReset}
                  className="w-full p-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-left flex items-center justify-between shadow-lg shadow-red-600/20 transition-colors"
                >
                  <div>
                    <p className="text-xs font-extrabold">
                      🔴 RESET TOUT À ZÉRO (0,00 €)
                    </p>
                    <p className="text-[11px] text-white/85 mt-0.5">
                      Vide tout : solde à 0 €, enveloppes à 0 €, opérations,
                      courses, boîtes Batch et agenda. Idéal pour repartir de
                      zéro.
                    </p>
                  </div>
                  <RotateCcw className="w-4 h-4 shrink-0 ml-2" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleNewMonthRestart}
                  className="w-full p-3.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-left flex items-center justify-between shadow-lg shadow-[#0071E3]/20 transition-colors"
                >
                  <div>
                    <p className="text-xs font-extrabold">
                      🗓️ Démarrer un Nouveau Mois (Garde le salaire)
                    </p>
                    <p className="text-[11px] text-white/85 mt-0.5">
                      Remet toutes les dépenses d&apos;enveloppes à 0 € tout en
                      conservant ton salaire de base.
                    </p>
                  </div>
                  <Sparkles className="w-4 h-4 shrink-0 ml-2" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => {
                    resetToSeedData();
                    triggerResetFeedback("Données d'exemple restaurées !");
                  }}
                  className="w-full p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-[#0F172A] text-left flex items-center justify-between transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold">
                      ✨ Restaurer les données d&apos;exemple (Démo)
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Recharge le budget, les recettes Batch et le panier de
                      démonstration.
                    </p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              transition={APPLE_SPRING}
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
                      Plein écran • Sans barre Safari • 100% Privé
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
                    <p className="font-bold">
                      1. Ouvre ce lien dans Safari sur ton iPhone
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Appuie sur l&apos;icône <strong>Partager</strong> (le
                      carré avec la flèche vers le haut en bas de Safari).
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
                      L&apos;icône officielle <strong>Kora</strong> apparaît sur
                      ton iPhone et s&apos;ouvre en plein écran comme une vraie
                      application native.
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
                      Tes comptes, ton solde et tes boîtes Batch sont stockés{" "}
                      <strong>
                        uniquement dans la mémoire privée de ton iPhone
                      </strong>
                      . Personne d&apos;autre sur Internet ne peut voir tes
                      chiffres.
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
