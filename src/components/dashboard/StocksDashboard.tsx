"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { VitalAgentCard } from "./VitalAgentCard";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

const APPLE_SPRING = {
  type: "spring" as const,
  stiffness: 360,
  damping: 30,
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
        bg: "from-emerald-500 to-teal-600 shadow-emerald-500/20",
      };
    case "env-resto":
      return {
        icon: <Utensils className="w-4 h-4 text-white" />,
        bg: "from-amber-500 to-orange-500 shadow-amber-500/20",
      };
    case "env-health":
      return {
        icon: <HeartPulse className="w-4 h-4 text-white" />,
        bg: "from-sky-500 to-blue-600 shadow-sky-500/20",
      };
    case "env-mobil":
      return {
        icon: <TrainFront className="w-4 h-4 text-white" />,
        bg: "from-indigo-500 to-blue-700 shadow-indigo-500/20",
      };
    default:
      return {
        icon: <Sparkles className="w-4 h-4 text-white" />,
        bg: "from-purple-500 to-pink-600 shadow-purple-500/20",
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
    deleteTransaction,
    clearAllDemoData,
  } = useFinanceStore();

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

  return (
    <div className="space-y-5 pb-28">
      {/* 1. APPLE CARD TITANIUM HERO BALANCE */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={APPLE_SPRING}
        className="apple-titanium-card relative rounded-[28px] p-5 sm:p-6 overflow-hidden"
      >
        {/* Subtle Titanium Specular Sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-gradient-to-br from-[#0071E3]/15 via-purple-400/10 to-transparent blur-2xl"
        />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Reste à vivre disponible
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#64748B] tabular-nums">
            {remainingDays} jours restants
          </span>
        </div>

        <div className="relative mt-2 flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.04em] text-[#0F172A] tabular-nums">
            <AnimatedCounter value={disposableLeft} />
          </h2>

          <motion.div
            whileHover={{ scale: 1.03 }}
            className="apple-glass-pill px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm"
          >
            <span className="text-xs font-bold text-[#0071E3] tabular-nums">
              <AnimatedCounter value={dailyBudgetAllowed} suffix=" € / jour" />
            </span>
          </motion.div>
        </div>

        {/* 3 Frosted Titanium Metric Capsules */}
        <div className="relative grid grid-cols-3 gap-2.5 mt-5">
          <motion.div
            whileHover={{ y: -2 }}
            transition={APPLE_SPRING}
            className="rounded-2xl bg-white/80 border border-white p-3 shadow-2xs"
          >
            <span className="text-[11px] font-medium text-[#64748B] block">
              Revenu net
            </span>
            <span className="text-sm font-bold text-[#0F172A] tabular-nums mt-0.5 block">
              <AnimatedCounter value={monthlyIncome} decimals={0} />
            </span>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            transition={APPLE_SPRING}
            className="rounded-2xl bg-white/80 border border-white p-3 shadow-2xs"
          >
            <span className="text-[11px] font-medium text-[#64748B] block">
              Épargne
            </span>
            <span className="text-sm font-bold text-[#0071E3] tabular-nums mt-0.5 block">
              <AnimatedCounter value={savingsTarget} decimals={0} />
            </span>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            transition={APPLE_SPRING}
            className="rounded-2xl bg-white/80 border border-white p-3 shadow-2xs"
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

      {/* 2. DUAL-AGENT COMMAND CENTER (VITAL CFO + NUTRITIONNISTE IA) */}
      <VitalAgentCard />

      {/* 3. BENTO ENVELOPES WITH BESPOKE VECTOR SQUIRCLES & SPRING BARS */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...APPLE_SPRING, delay: 0.12 }}
        className="apple-glass rounded-[28px] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Enveloppes Budgétaires
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Pilotées en temps réel par tes 2 agents IA
            </p>
          </div>
          <span className="text-xs font-semibold text-[#64748B] tabular-nums">
            {formatEUR(totalVariableSpent)} utilisés
          </span>
        </div>

        <div className="space-y-4">
          {envelopes.map((env, index) => {
            const pctUsed = Math.min(
              100,
              Math.round((env.spent / Math.max(1, env.allocated)) * 100)
            );
            const remaining = Number((env.allocated - env.spent).toFixed(2));
            const badge = getEnvelopeIconBadge(env.id);

            return (
              <motion.div
                key={env.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...APPLE_SPRING, delay: 0.04 * index }}
                className="p-3 rounded-2xl bg-white/75 border border-white shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl bg-gradient-to-br ${badge.bg} shadow-sm flex items-center justify-center shrink-0`}
                    >
                      {badge.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-[#0F172A] block truncate">
                        {env.name}
                      </span>
                      <span className="text-[11px] text-[#64748B] tabular-nums">
                        {formatEUR(env.spent)} sur {formatEUR(env.allocated)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <span className="text-sm font-bold text-[#0F172A] block">
                      {formatEUR(remaining)}
                    </span>
                    <span className="text-[10px] font-medium text-[#64748B]">
                      disponibles
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-900/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctUsed}%` }}
                    transition={{
                      type: "spring",
                      stiffness: 120,
                      damping: 20,
                    }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor:
                        pctUsed > 85
                          ? "#EF4444"
                          : pctUsed > 70
                          ? "#F59E0B"
                          : "#0071E3",
                    }}
                  />
                </div>
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
        className="apple-glass rounded-[28px] p-5"
      >
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Dernières Opérations
          </h3>
          {transactions.length > 0 && (
            <button
              type="button"
              onClick={clearAllDemoData}
              className="text-[11px] font-semibold text-[#64748B] hover:text-[#0F172A] flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Remettre à zéro</span>
            </button>
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={APPLE_SPRING}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/80 border border-white shadow-2xs"
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
                      <button
                        type="button"
                        onClick={() => deleteTransaction(tx.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
