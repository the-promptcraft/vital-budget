"use client";

import React, { useMemo } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatEUR } from "@/lib/utils";
import { Trash2, RotateCcw } from "lucide-react";
import { VitalAgentCard } from "./VitalAgentCard";

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
      {/* 1. APPLE GLASS HERO BALANCE CARD */}
      <section className="apple-glass rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#6E6E73] tracking-tight">
            Reste à vivre disponible
          </span>
          <span className="text-[11px] text-[#86868B] font-medium tabular-nums">
            {remainingDays} jours restants
          </span>
        </div>

        <div className="mt-1.5 flex items-baseline justify-between gap-4">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.04em] text-[#1D1D1F] tabular-nums">
            {formatEUR(disposableLeft)}
          </h2>
          <span className="apple-glass-pill inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-[#0071E3] tabular-nums">
            {formatEUR(dailyBudgetAllowed)} / jour
          </span>
        </div>

        {/* 3 Frosted Glass Sub-Pills */}
        <div className="grid grid-cols-3 gap-2.5 mt-4">
          <div className="rounded-2xl bg-white/60 border border-white/80 p-3 shadow-2xs">
            <span className="text-[11px] text-[#6E6E73] block">
              Revenu net
            </span>
            <span className="text-sm font-semibold text-[#1D1D1F] tabular-nums mt-0.5 block">
              {formatEUR(monthlyIncome)}
            </span>
          </div>

          <div className="rounded-2xl bg-white/60 border border-white/80 p-3 shadow-2xs">
            <span className="text-[11px] text-[#6E6E73] block">
              Épargne
            </span>
            <span className="text-sm font-semibold text-[#0071E3] tabular-nums mt-0.5 block">
              {formatEUR(savingsTarget)}
            </span>
          </div>

          <div className="rounded-2xl bg-white/60 border border-white/80 p-3 shadow-2xs">
            <span className="text-[11px] text-[#6E6E73] block">
              Charges fixes
            </span>
            <span className="text-sm font-semibold text-[#1D1D1F] tabular-nums mt-0.5 block">
              {formatEUR(totalFixed)}
            </span>
          </div>
        </div>
      </section>

      {/* 2. APPLE INTELLIGENCE AGENT CARD (CONTROLS EVERYTHING) */}
      <VitalAgentCard />

      {/* 3. APPLE FROSTED GLASS ENVELOPES */}
      <section className="apple-glass rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider">
            Enveloppes du mois
          </h3>
          <span className="text-xs text-[#6E6E73] font-medium tabular-nums">
            {formatEUR(totalVariableSpent)} utilisés
          </span>
        </div>

        <div className="space-y-4">
          {envelopes.map((env) => {
            const pctUsed = Math.min(
              100,
              Math.round((env.spent / Math.max(1, env.allocated)) * 100)
            );
            const remaining = Number((env.allocated - env.spent).toFixed(2));

            return (
              <div key={env.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{env.icon}</span>
                    <span className="font-semibold text-[#1D1D1F] truncate">
                      {env.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 tabular-nums">
                    <span className="text-[#86868B] text-[11px]">
                      {formatEUR(env.spent)} / {formatEUR(env.allocated)}
                    </span>
                    <span className="font-semibold text-[#1D1D1F]">
                      {formatEUR(remaining)}
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-black/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pctUsed}%`,
                      backgroundColor:
                        pctUsed > 85
                          ? "#FF3B30"
                          : pctUsed > 70
                          ? "#FF9500"
                          : "#0071E3",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. APPLE GLASS RECENT OPERATIONS */}
      <section className="apple-glass rounded-3xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider">
            Dernières opérations
          </h3>
          {transactions.length > 0 && (
            <button
              type="button"
              onClick={clearAllDemoData}
              className="text-[11px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Remettre à zéro</span>
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <p className="text-xs text-[#86868B] text-center py-6">
            Aucune opération. Écris simplement une dépense à l&apos;assistant ci-dessus.
          </p>
        ) : (
          <div className="divide-y divide-black/[0.06]">
            {transactions.slice(0, 5).map((tx) => {
              const env = envelopes.find((e) => e.id === tx.envelopeId);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/80 border border-black/[0.05] flex items-center justify-center text-sm shrink-0">
                      {tx.type === "income" ? "💰" : env?.icon || "💳"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1D1D1F] truncate">
                        {tx.label}
                      </p>
                      <p className="text-[11px] text-[#86868B] tabular-nums">
                        {formatDateLabel(tx.date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        tx.type === "income"
                          ? "text-emerald-600"
                          : "text-[#1D1D1F]"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatEUR(tx.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteTransaction(tx.id)}
                      className="text-[#86868B] hover:text-red-500 transition-colors p-1"
                      title="Supprimer"
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
