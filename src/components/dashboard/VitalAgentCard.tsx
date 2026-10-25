"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatEUR } from "@/lib/utils";
import {
  ArrowUp,
  CalendarPlus,
  Check,
  KeyRound,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type {
  AgentContextPayload,
  AgentResponsePayload,
  AgentActionType,
} from "@/app/api/agent/route";

const DAILY_FREE_LIMIT = 40;
const STORAGE_KEY_KILL_SWITCH = "vital_agent_kill_switch_v1";
const STORAGE_KEY_DAILY_COUNT = "vital_agent_daily_count_v1";
const STORAGE_KEY_HF_TOKEN = "vital_agent_hf_token_v1";

const APPLE_SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

interface SmartNotification {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaCommand: string;
}

export function VitalAgentCard() {
  const {
    monthlyIncome,
    savingsTarget,
    envelopes,
    fixedExpenses,
    transactions,
    batchMeals,
    addTransaction,
    deleteTransaction,
    consumeBatchPortion,
    updateBudgetTargets,
    updateEnvelopeAllocation,
  } = useFinanceStore();

  const envAgentEnabled =
    process.env.NEXT_PUBLIC_ENABLE_AI_AGENT !== "false";

  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY_KILL_SWITCH) === "true";
    } catch {
      return false;
    }
  });

  const [dailyCallsUsed, setDailyCallsUsed] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const rawCount = localStorage.getItem(STORAGE_KEY_DAILY_COUNT);
      if (rawCount) {
        const parsed = JSON.parse(rawCount);
        if (parsed.date === todayStr) {
          return Number(parsed.count) || 0;
        }
        localStorage.setItem(
          STORAGE_KEY_DAILY_COUNT,
          JSON.stringify({ date: todayStr, count: 0 })
        );
      }
    } catch {}
    return 0;
  });

  const [customHfToken, setCustomHfToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(STORAGE_KEY_HF_TOKEN) || "";
    } catch {
      return "";
    }
  });

  const [tokenSavedFeedback, setTokenSavedFeedback] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentReply, setAgentReply] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<AgentActionType | null>(null);
  const [lastProvider, setLastProvider] = useState<string>("local-smart-engine");
  const [showHfDrawer, setShowHfDrawer] = useState(false);

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

  // Subtle Proactive Notification
  const smartNotifications = useMemo<SmartNotification[]>(() => {
    const list: SmartNotification[] = [];

    const readyMeal = batchMeals.find((m) => m.remainingPortions > 0);
    if (readyMeal) {
      const saved = (
        readyMeal.externalMealPrice - readyMeal.costPerPortion
      ).toFixed(0);
      list.push({
        id: `notif-meal-${readyMeal.id}`,
        title: `${readyMeal.remainingPortions} portions de ${readyMeal.title} au frigo`,
        subtitle: `Économise ${saved} € ce soir en évitant une commande.`,
        ctaLabel: "Déduire 1 portion",
        ctaCommand: `J'ai mangé 1 portion de ${readyMeal.title}`,
      });
    }

    return list;
  }, [batchMeals]);

  const toggleKillSwitch = () => {
    const next = !killSwitchActive;
    setKillSwitchActive(next);
    try {
      localStorage.setItem(STORAGE_KEY_KILL_SWITCH, String(next));
    } catch {}
    if (next) {
      setAgentReply("Kill Switch activé. L'agent est verrouillé (0,00 €).");
      setLastAction({ type: "NONE" });
    } else {
      setAgentReply("Agent actif. Que veux-tu noter ou modifier ?");
    }
  };

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(STORAGE_KEY_HF_TOKEN, customHfToken.trim());
      setTokenSavedFeedback(true);
      setTimeout(() => setTokenSavedFeedback(false), 2500);
    } catch {}
  };

  const incrementDailyCounter = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const nextCount = dailyCallsUsed + 1;
    setDailyCallsUsed(nextCount);
    try {
      localStorage.setItem(
        STORAGE_KEY_DAILY_COUNT,
        JSON.stringify({ date: todayStr, count: nextCount })
      );
    } catch {}
  };

  // Directly apply the agent's action to the app state
  const executeAgentAction = (action: AgentActionType) => {
    if (!action || action.type === "NONE") return;

    const todayYmd = new Date().toISOString().split("T")[0];

    if (action.type === "SET_DISPOSABLE_LEFT") {
      // disposableLeft = monthlyIncome - totalFixed - savingsTarget - totalVariableSpent
      // So to make disposableLeft === targetDisposable:
      const newRequiredIncome = Number(
        (
          action.targetDisposable +
          totalFixed +
          savingsTarget +
          totalVariableSpent
        ).toFixed(2)
      );
      updateBudgetTargets(newRequiredIncome, savingsTarget);
    } else if (action.type === "UNDO_LAST_TRANSACTION") {
      deleteTransaction(action.txId);
    } else if (action.type === "ADD_EXPENSE") {
      addTransaction({
        label: action.label,
        amount: action.amount,
        date: todayYmd,
        envelopeId: action.envelopeId,
        type: "expense",
      });
    } else if (action.type === "ADD_INCOME") {
      addTransaction({
        label: action.label,
        amount: action.amount,
        date: todayYmd,
        envelopeId: "income",
        type: "income",
      });
    } else if (action.type === "CONSUME_BATCH_MEAL") {
      consumeBatchPortion(action.mealId);
    } else if (action.type === "UPDATE_SAVINGS_TARGET") {
      updateBudgetTargets(monthlyIncome, action.newSavingsTarget);
    } else if (action.type === "UPDATE_ENVELOPE_BUDGET") {
      updateEnvelopeAllocation(action.envelopeId, action.newAllocated);
    }
  };

  const sendToAgent = async (commandText: string) => {
    const trimmed = commandText.trim();
    if (!trimmed || isLoading) return;

    if (!envAgentEnabled || killSwitchActive) {
      setAgentReply(
        "Le Kill Switch est activé. Réactive le bouton en haut à droite pour parler à l'agent."
      );
      setLastAction({ type: "NONE" });
      return;
    }

    if (dailyCallsUsed >= DAILY_FREE_LIMIT) {
      setAgentReply(
        `Limite quotidienne atteinte (${DAILY_FREE_LIMIT}/${DAILY_FREE_LIMIT} entrées aujourd'hui • 0,00 €). Réinitialisation à minuit.`
      );
      return;
    }

    setIsLoading(true);
    setInput("");

    const lastTx = transactions[0]
      ? {
          id: transactions[0].id,
          label: transactions[0].label,
          amount: transactions[0].amount,
        }
      : null;

    const contextPayload: AgentContextPayload = {
      disposableLeft,
      dailyBudgetAllowed,
      remainingDays,
      monthlyIncome,
      savingsTarget,
      totalFixed,
      totalVariableSpent,
      lastTransaction: lastTx,
      envelopes: envelopes.map((e) => ({
        id: e.id,
        name: e.name,
        allocated: e.allocated,
        spent: e.spent,
      })),
      batchMeals: batchMeals.map((m) => ({
        id: m.id,
        title: m.title,
        remainingPortions: m.remainingPortions,
        costPerPortion: m.costPerPortion,
        externalMealPrice: m.externalMealPrice,
      })),
    };

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          context: contextPayload,
          hfToken: customHfToken,
          killSwitch: killSwitchActive,
        }),
      });

      const data: AgentResponsePayload = await res.json();
      incrementDailyCounter();
      setAgentReply(data.reply);
      setLastAction(data.action);
      setLastProvider(data.provider);

      if (data.action && data.action.type !== "NONE") {
        executeAgentAction(data.action);
      }
    } catch {
      setAgentReply("Une erreur réseau est survenue, réessaie.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendToAgent(input);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={APPLE_SPRING}
      className="relative rounded-2xl bg-[#111114] border border-white/[0.08] p-4 sm:p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_20px_40px_-15px_rgba(0,0,0,0.7)]"
    >
      {/* Top Bar: Minimalist Vercel Header + Kill Switch */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium text-zinc-200 tracking-tight">
            Assistant Personnel
          </span>
          <span className="text-[11px] text-zinc-500 tabular-nums">
            • {dailyCallsUsed}/{DAILY_FREE_LIMIT} aujourd&apos;hui
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowHfDrawer(!showHfDrawer)}
            className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[11px] text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <KeyRound className="w-3 h-3" />
            <span>
              {customHfToken.startsWith("hf_") ? "HF Connecté" : "Clé HF"}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleKillSwitch}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 border transition-colors ${
              killSwitchActive || !envAgentEnabled
                ? "bg-red-500/10 text-red-400 border-red-500/25"
                : "bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:bg-white/[0.08]"
            }`}
          >
            {killSwitchActive || !envAgentEnabled ? (
              <>
                <ShieldAlert className="w-3 h-3 text-red-400" />
                <span>Off</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Actif (0€)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Vercel v0-Style Prompt Input Box */}
      <form onSubmit={handleFormSubmit} className="mt-3.5 relative">
        <div className="relative flex items-center rounded-xl bg-[#09090B] border border-white/[0.1] focus-within:border-white/30 transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={killSwitchActive || !envAgentEnabled}
            placeholder={
              killSwitchActive
                ? "Assistant désactivé (Kill Switch actif)..."
                : "Ex: « J'ai pas 400 mais 359€ », « Courses 22€ », « Mets sur Google Agenda... »"
            }
            className="w-full bg-transparent pl-3.5 pr-12 py-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none disabled:opacity-40"
          />
          <motion.button
            whileTap={{ scale: 0.92 }}
            transition={APPLE_SPRING}
            type="submit"
            disabled={isLoading || !input.trim() || killSwitchActive}
            aria-label="Envoyer à l'agent"
            className="absolute right-2 w-8 h-8 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-20 flex items-center justify-center transition-opacity"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.2]" />
          </motion.button>
        </div>
      </form>

      {/* Quick Action Suggestions (Vercel Pill Style) */}
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() =>
            sendToAgent("Le dashboard est pas bon, j'ai pas 400 mais 359 eur")
          }
          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[11px] text-zinc-300 transition-colors tabular-nums"
        >
          Corriger solde → 359 €
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() =>
            sendToAgent("Mets sur mon Google Agenda : Batch Cooking demain à 18h")
          }
          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[11px] text-zinc-300 transition-colors flex items-center gap-1"
        >
          <CalendarPlus className="w-3 h-3 text-zinc-400" />
          <span>Google Agenda</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => sendToAgent("Courses 22€ Lidl")}
          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[11px] text-zinc-300 transition-colors tabular-nums"
        >
          +22 € Courses
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => sendToAgent("J'ai mangé 1 portion du frigo")}
          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[11px] text-zinc-300 transition-colors"
        >
          -1 Portion Frigo
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => sendToAgent("Annule la dernière dépense")}
          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[11px] text-zinc-300 transition-colors flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3 text-zinc-400" />
          <span>Annuler dernière</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => sendToAgent("Bilan du jour")}
          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[11px] text-zinc-300 transition-colors"
        >
          Bilan du jour
        </motion.button>
      </div>

      {/* Agent Reply & Action Card (Incl. 1-Click Google Agenda Button) */}
      <AnimatePresence mode="wait">
        {agentReply && (
          <motion.div
            key={agentReply}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={APPLE_SPRING}
            className="mt-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-zinc-300 mt-0.5 shrink-0" />
                <p className="text-xs sm:text-[13px] text-zinc-100 leading-relaxed">
                  {agentReply}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAgentReply(null)}
                className="text-zinc-500 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* If Google Calendar Event was generated, show 1-click Google Agenda button */}
            {lastAction && lastAction.type === "CREATE_CALENDAR_EVENT" && (
              <div className="pt-1 flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#09090B] border border-white/[0.08]">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {lastAction.title}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {lastAction.dateLabel}
                  </p>
                </div>
                <a
                  href={lastAction.googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Ouvrir Google Agenda</span>
                </a>
              </div>
            )}

            {/* Confirmation badge for other store modifications */}
            {lastAction &&
              lastAction.type !== "NONE" &&
              lastAction.type !== "CREATE_CALENDAR_EVENT" && (
                <div className="flex items-center justify-between text-[11px] text-emerald-400 pt-0.5">
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Check className="w-3.5 h-3.5" />
                    {lastAction.type === "SET_DISPOSABLE_LEFT" &&
                      `Reste à vivre ajusté à ${formatEUR(lastAction.targetDisposable)}`}
                    {lastAction.type === "UNDO_LAST_TRANSACTION" &&
                      `Supprimé : ${lastAction.txLabel} (${formatEUR(lastAction.txAmount)})`}
                    {lastAction.type === "ADD_EXPENSE" &&
                      `Ajouté : -${formatEUR(lastAction.amount)} (${lastAction.envelopeName})`}
                    {lastAction.type === "ADD_INCOME" &&
                      `Ajouté : +${formatEUR(lastAction.amount)} (${lastAction.label})`}
                    {lastAction.type === "CONSUME_BATCH_MEAL" &&
                      `-1 portion (${lastAction.mealTitle}) • +${formatEUR(lastAction.savedAmount)} économisés`}
                    {lastAction.type === "UPDATE_SAVINGS_TARGET" &&
                      `Épargne ajustée à ${formatEUR(lastAction.newSavingsTarget)}`}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {lastProvider === "huggingface-qwen2.5"
                      ? "Qwen 2.5 HF"
                      : "Moteur instantané"}
                  </span>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle Proactive Suggestion Strip */}
      <AnimatePresence>
        {smartNotifications.length > 0 && !agentReply && !killSwitchActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2"
          >
            <p className="text-[11px] text-zinc-400 truncate">
              💡 {smartNotifications[0].title} —{" "}
              <span className="text-zinc-500">
                {smartNotifications[0].subtitle}
              </span>
            </p>
            <button
              type="button"
              onClick={() => sendToAgent(smartNotifications[0].ctaCommand)}
              className="shrink-0 text-[11px] font-medium text-white hover:underline"
            >
              {smartNotifications[0].ctaLabel} →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hugging Face Token Drawer (Optional) */}
      <AnimatePresence>
        {showHfDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={APPLE_SPRING}
            className="mt-3.5 pt-3.5 border-t border-white/[0.07] overflow-hidden space-y-2.5 text-xs"
          >
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              <strong>Comment marche la connexion Hugging Face ?</strong> Par
              défaut, l&apos;assistant fonctionne immédiatement sans compte grâce
              au moteur intégré. Si tu veux activer le modèle{" "}
              <code className="text-zinc-200">Qwen/Qwen2.5-7B-Instruct</code>{" "}
              hébergé gratuitement par Hugging Face, crée un token gratuit (sans
              carte bancaire) sur{" "}
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline"
              >
                huggingface.co/settings/tokens
              </a>{" "}
              et colle-le ici :
            </p>
            <form onSubmit={handleSaveToken} className="flex gap-2">
              <input
                type="password"
                value={customHfToken}
                onChange={(e) => setCustomHfToken(e.target.value)}
                placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#09090B] border border-white/[0.1] text-xs text-white font-mono focus:outline-none focus:border-white/30"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 font-medium text-xs transition-colors"
              >
                {tokenSavedFeedback ? "Enregistré ✓" : "Connecter"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
