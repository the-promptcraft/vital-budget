"use client";

import React, { useMemo, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatEUR } from "@/lib/utils";
import {
  Trash2,
  RotateCcw,
  ShoppingBag,
  Utensils,
  HeartPulse,
  TrainFront,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Plus,
} from "lucide-react";
import { VitalAgentCard } from "./VitalAgentCard";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

const APPLE_SPRING = {
  type: "spring" as const,
  stiffness: 360,
  damping: 28,
  mass: 0.85,
};

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
      return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      });
    }
  } catch {}
  return dStr;
}

function getEnvelopeIconBadge(envId: string) {
  switch (envId) {
    case "env-food":
      return {
        icon: <ShoppingBag className="w-4 h-4 text-white" />,
        bg: "from-emerald-500 to-teal-600 shadow-emerald-500/25",
      };
    case "env-resto":
      return {
        icon: <Utensils className="w-4 h-4 text-white" />,
        bg: "from-amber-500 to-orange-500 shadow-amber-500/25",
      };
    case "env-health":
      return {
        icon: <HeartPulse className="w-4 h-4 text-white" />,
        bg: "from-sky-500 to-blue-600 shadow-sky-500/25",
      };
    case "env-mobil":
      return {
        icon: <TrainFront className="w-4 h-4 text-white" />,
        bg: "from-indigo-500 to-blue-700 shadow-indigo-500/25",
      };
    default:
      return {
        icon: <Sparkles className="w-4 h-4 text-white" />,
        bg: "from-purple-500 to-pink-600 shadow-purple-500/25",
      };
  }
}

export function StocksDashboard() {
  const {
    monthlyIncome,
    savingsTarget,
    envelopes,
    fixedExpenses,
    transactions,
    addTransaction,
    deleteTransaction,
    clearAllDemoData,
  } = useFinanceStore();

  const [expandedEnvId, setExpandedEnvId] = useState<string | null>(null);

  // Interactive 3D Tilt Physics for the Apple Titanium Card
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [4, -4]), {
    stiffness: 260,
    damping: 25,
  });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-4, 4]), {
    stiffness: 260,
    damping: 25,
  });

  const handleCardPointerMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleCardPointerLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const totalFixed = useMemo(
    () => fixedExpenses.reduce((sum, f) => sum + f.amount, 0),
    [fixedExpenses]
  );

  const totalVariableSpent = useMemo(
    () => envelopes.reduce((sum, e) => sum + e.spent, 0),
    [envelopes]
  );

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

  // Health Ring % (Remaining disposable ratio)
  const healthRatio = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (disposableLeft / Math.max(1, disposableBeforeVariable)) * 100
      )
    )
  );
  const ringCircumference = 2 * Math.PI * 24;
  const ringOffset =
    ringCircumference - (healthRatio / 100) * ringCircumference;

  const quickLogEnvelopeExpense = (
    envId: string,
    envName: string,
    amt: number
  ) => {
    addTransaction({
      label: `${envName} (Ajout rapide)`,
      amount: amt,
      date: new Date().toISOString().split("T")[0],
      envelopeId: envId,
      type: "expense",
    });
  };

  return (
    <div className="space-y-5 pb-32">
      {/* 1. 3D INTERACTIVE APPLE CARD TITANIUM HERO */}
      <motion.section
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={APPLE_SPRING}
        style={{
          rotateX,
          rotateY,
          transformPerspective: 1100,
        }}
        onMouseMove={handleCardPointerMove}
        onMouseLeave={handleCardPointerLeave}
        className="apple-titanium-card relative rounded-[30px] p-5 sm:p-6 overflow-hidden select-none"
      >
        {/* Iridescent Apple Card Specular Orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-[#0071E3]/18 via-purple-400/14 to-emerald-300/12 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-gradient-to-tr from-emerald-400/12 via-sky-300/10 to-transparent blur-2xl"
        />

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
                Reste à vivre disponible
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.04em] text-[#0F172A] tabular-nums">
                <AnimatedCounter value={disposableLeft} />
              </h2>
            </div>

            <div className="mt-2.5 inline-flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.03 }}
                className="apple-glass-pill px-3 py-1 rounded-full flex items-center gap-1.5"
              >
                <span className="text-xs font-bold text-[#0071E3] tabular-nums">
                  <AnimatedCounter
                    value={dailyBudgetAllowed}
                    suffix=" € / jour"
                  />
                </span>
              </motion.div>
              <span className="text-[11px] font-medium text-[#64748B] tabular-nums">
                • {remainingDays}j restants
              </span>
            </div>
          </div>

          {/* Animated Apple Activity Ring Gauge */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="rgba(15,23,42,0.07)"
                strokeWidth="5"
              />
              <motion.circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="url(#ring-grad)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                initial={{ strokeDashoffset: ringCircumference }}
                animate={{ strokeDashoffset: ringOffset }}
                transition={{
                  type: "spring",
                  stiffness: 90,
                  damping: 20,
                }}
              />
              <defs>
                <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0071E3" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-extrabold text-[#0F172A] tabular-nums leading-none">
                {healthRatio}%
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-[#64748B] mt-0.5">
                Libre
              </span>
            </div>
          </div>
        </div>

        {/* 3 Frosted Titanium Metric Capsules */}
        <div className="relative grid grid-cols-3 gap-2.5 mt-5">
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            transition={APPLE_SPRING}
            className="rounded-2xl bg-white/85 border border-white p-3 shadow-xs"
          >
            <span className="text-[11px] font-medium text-[#64748B] block">
              Revenu net
            </span>
            <span className="text-sm font-bold text-[#0F172A] tabular-nums mt-0.5 block">
              <AnimatedCounter value={monthlyIncome} decimals={0} />
            </span>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            transition={APPLE_SPRING}
            className="rounded-2xl bg-white/85 border border-white p-3 shadow-xs"
          >
            <span className="text-[11px] font-medium text-[#64748B] block">
              Épargne
            </span>
            <span className="text-sm font-bold text-[#0071E3] tabular-nums mt-0.5 block">
              <AnimatedCounter value={savingsTarget} decimals={0} />
            </span>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            transition={APPLE_SPRING}
            className="rounded-2xl bg-white/85 border border-white p-3 shadow-xs"
          >
            <span className="text-[11px] font-medium text-[#64748B] block">
              Charges fixes
            </span>
            <span className="text-sm font-bold text-[#0F172A] tabular-nums mt-0.5 block">
              <AnimatedCounter value={totalFixed} decimals={0} />
            </span>
          </motion.div>
        </div>
      </motion.section>

      {/* 2. DUAL-AGENT COMMAND CENTER (KORA FLOW & KORA CHEF) */}
      <VitalAgentCard />

      {/* 3. INTERACTIVE BENTO ENVELOPES WITH SHIMMER BARS & 1-TAP DRAWERS */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...APPLE_SPRING, delay: 0.12 }}
        className="apple-glass rounded-[30px] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Enveloppes Intelligentes
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Touche une enveloppe pour un ajout 1-Tap ou parle à Kora
            </p>
          </div>
          <span className="text-xs font-bold text-[#0F172A] tabular-nums">
            <AnimatedCounter value={totalVariableSpent} suffix=" € utilisés" />
          </span>
        </div>

        <div className="space-y-3">
          {envelopes.map((env, index) => {
            const pctUsed = Math.min(
              100,
              Math.round((env.spent / Math.max(1, env.allocated)) * 100)
            );
            const remaining = Number((env.allocated - env.spent).toFixed(2));
            const badge = getEnvelopeIconBadge(env.id);
            const isExpanded = expandedEnvId === env.id;

            return (
              <motion.div
                key={env.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ y: -2 }}
                transition={{ ...APPLE_SPRING, delay: 0.03 * index }}
                className="p-3.5 rounded-2xl bg-white/85 border border-white shadow-xs space-y-2.5 cursor-pointer"
                onClick={() =>
                  setExpandedEnvId(isExpanded ? null : env.id)
                }
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${badge.bg} shadow-md flex items-center justify-center shrink-0`}
                    >
                      {badge.icon}
                    </motion.div>
                    <div className="min-w-0">
                      <span className="font-bold text-[#0F172A] block truncate">
                        {env.name}
                      </span>
                      <span className="text-[11px] text-[#64748B] tabular-nums">
                        {formatEUR(env.spent)} sur {formatEUR(env.allocated)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right tabular-nums">
                      <span className="text-sm font-extrabold text-[#0F172A] block">
                        <AnimatedCounter value={remaining} />
                      </span>
                      <span className="text-[10px] font-medium text-[#64748B]">
                        restants
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-[#94A3B8] transition-transform duration-300 ${
                        isExpanded ? "rotate-90 text-[#0071E3]" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Progress Bar with Liquid Shimmer Sweep */}
                <div className="relative w-full h-2.5 rounded-full bg-slate-900/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctUsed}%` }}
                    transition={{
                      type: "spring",
                      stiffness: 110,
                      damping: 20,
                    }}
                    className="relative h-full rounded-full overflow-hidden"
                    style={{
                      backgroundColor:
                        pctUsed > 85
                          ? "#EF4444"
                          : pctUsed > 70
                          ? "#F59E0B"
                          : "#0071E3",
                    }}
                  >
                    <div className="animate-shimmer absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  </motion.div>
                </div>

                {/* Expandable 1-Tap Quick Action Drawer */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={APPLE_SPRING}
                      className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[11px] font-medium text-[#64748B]">
                        Ajout rapide :
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[5, 15, 30].map((amt) => (
                          <motion.button
                            key={amt}
                            whileTap={{ scale: 0.92 }}
                            type="button"
                            onClick={() =>
                              quickLogEnvelopeExpense(env.id, env.name, amt)
                            }
                            className="px-2.5 py-1 rounded-xl bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] text-xs font-bold tabular-nums flex items-center gap-0.5 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{amt} €</span>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* 4. ANIMATED RECENT OPERATIONS STREAM */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...APPLE_SPRING, delay: 0.18 }}
        className="apple-glass rounded-[30px] p-5"
      >
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Journal en Temps Réel
          </h3>
          {transactions.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={clearAllDemoData}
              className="text-[11px] font-semibold text-[#64748B] hover:text-[#0F172A] flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Remettre à zéro</span>
            </motion.button>
          )}
        </div>

        {transactions.length === 0 ? (
          <p className="text-xs text-[#64748B] text-center py-6">
            Aucune opération. Parle à Kora Flow ci-dessus pour ajouter une
            dépense.
          </p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {transactions.slice(0, 5).map((tx) => {
                const isIncome = tx.type === "income";
                return (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -30, scale: 0.92 }}
                    whileHover={{ scale: 1.01 }}
                    transition={APPLE_SPRING}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/85 border border-white shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isIncome
                            ? "bg-emerald-500/12 text-emerald-600"
                            : "bg-blue-500/10 text-[#0071E3]"
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#0F172A] truncate">
                          {tx.label}
                        </p>
                        <p className="text-[11px] text-[#64748B] tabular-nums">
                          {formatDateLabel(tx.date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          isIncome ? "text-emerald-600" : "text-[#0F172A]"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatEUR(tx.amount)}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        type="button"
                        onClick={() => deleteTransaction(tx.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.section>
    </div>
  );
}
