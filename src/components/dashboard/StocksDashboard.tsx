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
    <div className="space-y-6 pb-28">
      {/* 1. VERCEL-STYLE EDITORIAL HERO BALANCE */}
      <section className="pt-2 pb-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400 tracking-tight">
            Reste à vivre disponible
          </span>
          <span className="text-[11px] text-zinc-500 tabular-nums">
            {remainingDays} jours restants ce mois
          </span>
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-4">
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-[-0.04em] text-white tabular-nums">
            {formatEUR(disposableLeft)}
          </h2>
          <div className="text-right">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-zinc-200 tabular-nums">
              {formatEUR(dailyBudgetAllowed)} / jour
            </span>
          </div>
        </div>

        {/* 3 Minimalist Metric Pills */}
        <div className="grid grid-cols-3 gap-2.5 mt-4">
          <div className="rounded-xl bg-[#111114] border border-white/[0.07] p-3">
            <span className="text-[11px] text-zinc-500 block">
              Revenu mensuel
            </span>
            <span className="text-sm font-medium text-zinc-100 tabular-nums mt-0.5 block">
              {formatEUR(monthlyIncome)}
            </span>
          </div>

          <div className="rounded-xl bg-[#111114] border border-white/[0.07] p-3">
            <span className="text-[11px] text-zinc-500 block">
              Épargne bloquée
            </span>
            <span className="text-sm font-medium text-zinc-100 tabular-nums mt-0.5 block">
              {formatEUR(savingsTarget)}
            </span>
          </div>

          <div className="rounded-xl bg-[#111114] border border-white/[0.07] p-3">
            <span className="text-[11px] text-zinc-500 block">
              Charges fixes
            </span>
            <span className="text-sm font-medium text-zinc-100 tabular-nums mt-0.5 block">
              {formatEUR(totalFixed)}
            </span>
          </div>
        </div>
      </section>

      {/* 2. V0-STYLE AI AGENT COMMAND CENTER (PILOTES EVERYTHING) */}
      <VitalAgentCard />

      {/* 3. MINIMALIST BUDGET ENVELOPES */}
      <section className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-medium text-zinc-400 tracking-tight">
            Enveloppes du mois
          </h3>
          <span className="text-xs text-zinc-500 tabular-nums">
            {formatEUR(totalVariableSpent)} utilisés
          </span>
        </div>

        <div className="space-y-3.5">
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
                    <span>{env.icon}</span>
                    <span className="font-medium text-zinc-200 truncate">
                      {env.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 tabular-nums">
                    <span className="text-zinc-500 text-[11px]">
                      {formatEUR(env.spent)} / {formatEUR(env.allocated)}
                    </span>
                    <span className="font-medium text-white">
                      {formatEUR(remaining)}
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pctUsed}%`,
                      backgroundColor:
                        pctUsed > 85
                          ? "#ef4444"
                          : pctUsed > 70
                          ? "#f59e0b"
                          : "#fafafa",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. MINIMALIST RECENT ACTIVITY */}
      <section className="rounded-2xl bg-[#111114] border border-white/[0.08] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-zinc-400 tracking-tight">
            Dernières opérations
          </h3>
          {transactions.length > 0 && (
            <button
              type="button"
              onClick={clearAllDemoData}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Remettre à zéro</span>
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6">
            Aucune opération. Écris simplement une dépense à l&apos;assistant ci-dessus.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {transactions.slice(0, 5).map((tx) => {
              const env = envelopes.find((e) => e.id === tx.envelopeId);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sm">
                      {tx.type === "income" ? "↑" : env?.icon || "•"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate">
                        {tx.label}
                      </p>
                      <p className="text-[11px] text-zinc-500 tabular-nums">
                        {formatDateLabel(tx.date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        tx.type === "income"
                          ? "text-emerald-400"
                          : "text-zinc-200"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatEUR(tx.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteTransaction(tx.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1"
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
