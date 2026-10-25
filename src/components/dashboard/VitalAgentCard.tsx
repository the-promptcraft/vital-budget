"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatEUR } from "@/lib/utils";
import {
  Sparkles,
  Send,
  ShieldAlert,
  ShieldCheck,
  Bell,
  Utensils,
  ShoppingBag,
  TrendingUp,
  Info,
  KeyRound,
  CheckCircle2,
  X,
} from "lucide-react";
import type {
  AgentContextPayload,
  AgentResponsePayload,
  AgentActionType,
} from "@/app/api/agent/route";

const DAILY_FREE_LIMIT = 15;
const STORAGE_KEY_KILL_SWITCH = "vital_agent_kill_switch_v1";
const STORAGE_KEY_DAILY_COUNT = "vital_agent_daily_count_v1";
const STORAGE_KEY_HF_TOKEN = "vital_agent_hf_token_v1";

// Emil Kowalski's Apple Design Spring Config
const APPLE_SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

interface SmartNotification {
  id: string;
  type: "warning" | "saving" | "bullish";
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaCommand?: string;
}

export function VitalAgentCard() {
  const {
    monthlyIncome,
    savingsTarget,
    envelopes,
    fixedExpenses,
    batchMeals,
    addTransaction,
    consumeBatchPortion,
    updateBudgetTargets,
  } = useFinanceStore();

  // Kill Switch & Daily Counter State
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

  // Agent UI State
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentReply, setAgentReply] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<AgentActionType | null>(null);
  const [lastProvider, setLastProvider] = useState<string>("local-smart-engine");
  const [showLearnDrawer, setShowLearnDrawer] = useState(false);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>([]);

  // Financial Metrics for Agent Context
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

  // Proactive Smart Notifications (Calculated automatically with 0 API cost)
  const smartNotifications = useMemo<SmartNotification[]>(() => {
    const list: SmartNotification[] = [];

    // 1. Check if any envelope is > 75% spent
    const highEnvelope = envelopes.find(
      (e) => e.allocated > 0 && e.spent / e.allocated >= 0.75
    );
    if (highEnvelope) {
      const pct = Math.round((highEnvelope.spent / highEnvelope.allocated) * 100);
      list.push({
        id: `notif-env-${highEnvelope.id}`,
        type: "warning",
        title: `Alerte Budget : ${highEnvelope.name} à ${pct}%`,
        subtitle: `Tu as utilisé ${formatEUR(highEnvelope.spent)} sur ${formatEUR(highEnvelope.allocated)}.`,
        ctaLabel: "Demander conseil",
        ctaCommand: "Bilan du jour",
      });
    }

    // 2. Check if there are ready-to-eat batch meals in the fridge
    const readyMeal = batchMeals.find((m) => m.remainingPortions > 0);
    if (readyMeal) {
      const saved = (
        readyMeal.externalMealPrice - readyMeal.costPerPortion
      ).toFixed(2);
      list.push({
        id: `notif-meal-${readyMeal.id}`,
        type: "saving",
        title: `Frigo : ${readyMeal.remainingPortions} portions de ${readyMeal.title}`,
        subtitle: `Mange une portion ce soir pour économiser ${saved} € vs resto.`,
        ctaLabel: "Manger 1 portion (-1)",
        ctaCommand: `J'ai mangé 1 portion de ${readyMeal.title}`,
      });
    }

    return list.filter((n) => !dismissedNotifIds.includes(n.id));
  }, [envelopes, batchMeals, dismissedNotifIds]);

  const toggleKillSwitch = () => {
    const next = !killSwitchActive;
    setKillSwitchActive(next);
    try {
      localStorage.setItem(STORAGE_KEY_KILL_SWITCH, String(next));
    } catch {}
    if (next) {
      setAgentReply(
        "🛑 Kill Switch activé. L'agent IA est verrouillé (0 requête réseau, 0,00 €)."
      );
      setLastAction({ type: "NONE" });
    } else {
      setAgentReply(
        "🟢 Agent réactivé (Mode 100% Gratuit). Dis-moi une dépense ou demande ton bilan !"
      );
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

  // Execute the action returned by the Agent directly on the Zustand store
  const executeAgentAction = (action: AgentActionType) => {
    if (!action || action.type === "NONE") return;

    const todayYmd = new Date().toISOString().split("T")[0];

    if (action.type === "ADD_EXPENSE") {
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
    }
  };

  const sendToAgent = async (commandText: string) => {
    const trimmed = commandText.trim();
    if (!trimmed || isLoading) return;

    // Layer 1 & 2 Kill Switch check
    if (!envAgentEnabled || killSwitchActive) {
      setAgentReply(
        "🛑 Kill Switch actif : l'agent est coupé. Désactive le bouton rouge Kill Switch en haut à droite pour l'utiliser."
      );
      setLastAction({ type: "NONE" });
      return;
    }

    if (dailyCallsUsed >= DAILY_FREE_LIMIT) {
      setAgentReply(
        `🛡️ Limite de sécurité gratuite atteinte (${DAILY_FREE_LIMIT}/${DAILY_FREE_LIMIT} appels aujourd'hui • 0,00 €). Réinitialisation demain !`
      );
      return;
    }

    setIsLoading(true);
    setInput("");

    const contextPayload: AgentContextPayload = {
      disposableLeft,
      dailyBudgetAllowed,
      remainingDays,
      monthlyIncome,
      savingsTarget,
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

      // Directly manage the app if an action was returned
      if (data.action && data.action.type !== "NONE") {
        executeAgentAction(data.action);
      }
    } catch {
      setAgentReply(
        "⚡ Mode hors-ligne actif : réessaie dans un instant."
      );
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={APPLE_SPRING}
      className="relative rounded-3xl bg-[#1C1C1E] border border-white/[0.1] p-4 sm:p-5 shadow-2xl overflow-hidden"
    >
      {/* Subtle Apple Intelligence Top Specular Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#64D2FF]/50 to-transparent"
      />

      {/* HEADER — AGENT STATUS + 1-TAP KILL SWITCH */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#0A84FF]/25 via-[#64D2FF]/15 to-[#30D158]/20 border border-white/[0.12] flex items-center justify-center shadow-inner">
            <Sparkles className="w-4 h-4 text-[#64D2FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-white">
                Vital Agent IA
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/25 tabular-nums">
                100% FREE • 0,00 €
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Pilote automatique du budget & notifications
            </p>
          </div>
        </div>

        {/* KILL SWITCH + DAILY COUNTER + LEARN BUTTON */}
        <div className="flex items-center gap-1.5">
          <span
            title="Compteur de sécurité quotidien gratuit"
            className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-xl bg-[#2C2C2E]/80 border border-white/[0.06] text-[10px] font-mono text-zinc-300 tabular-nums"
          >
            {dailyCallsUsed}/{DAILY_FREE_LIMIT} calls
          </span>

          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={APPLE_SPRING}
            type="button"
            onClick={() => setShowLearnDrawer(!showLearnDrawer)}
            className="px-2.5 py-1.5 rounded-xl bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/[0.08] text-[11px] font-medium text-zinc-200 flex items-center gap-1"
          >
            <Info className="w-3.5 h-3.5 text-[#64D2FF]" />
            <span>HF / Info</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            transition={APPLE_SPRING}
            type="button"
            onClick={toggleKillSwitch}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 border transition-colors ${
              killSwitchActive || !envAgentEnabled
                ? "bg-[#FF453A]/20 text-[#FF453A] border-[#FF453A]/40"
                : "bg-[#30D158]/15 text-[#30D158] border-[#30D158]/30 hover:bg-[#30D158]/25"
            }`}
          >
            {killSwitchActive || !envAgentEnabled ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Kill Switch ON</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Agent ON</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* PROACTIVE SMART NOTIFICATIONS (APPLE BANNER STYLE) */}
      <AnimatePresence>
        {smartNotifications.length > 0 && !killSwitchActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={APPLE_SPRING}
            className="mt-3.5 space-y-2 overflow-hidden"
          >
            {smartNotifications.slice(0, 2).map((notif) => (
              <motion.div
                key={notif.id}
                layout
                transition={APPLE_SPRING}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                  notif.type === "warning"
                    ? "bg-[#FF9F0A]/10 border-[#FF9F0A]/25"
                    : "bg-[#0A84FF]/10 border-[#0A84FF]/25"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Bell
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      notif.type === "warning"
                        ? "text-[#FF9F0A]"
                        : "text-[#64D2FF]"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-zinc-300 leading-snug">
                      {notif.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {notif.ctaCommand && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      transition={APPLE_SPRING}
                      type="button"
                      onClick={() => sendToAgent(notif.ctaCommand!)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white border border-white/[0.1]"
                    >
                      {notif.ctaLabel}
                    </motion.button>
                  )}
                  <button
                    type="button"
                    aria-label="Fermer la notification"
                    onClick={() =>
                      setDismissedNotifIds((prev) => [...prev, notif.id])
                    }
                    className="p-1 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AGENT RESPONSE BUBBLE + EXECUTED ACTION PILL */}
      <AnimatePresence mode="wait">
        {agentReply && (
          <motion.div
            key={agentReply}
            initial={{ opacity: 0, y: 6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={APPLE_SPRING}
            className="mt-3.5 p-3.5 rounded-2xl bg-[#2C2C2E]/90 border border-white/[0.08] space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#64D2FF]">
                {lastProvider === "huggingface-qwen2.5"
                  ? "🤗 Hugging Face • Qwen 2.5 (Free)"
                  : lastProvider === "kill-switch-blocked"
                  ? "🛑 Kill Switch Protection"
                  : "⚡ Vital Local Agent (0€ • Instant)"}
              </span>
              <button
                type="button"
                onClick={() => setAgentReply(null)}
                className="text-[10px] text-zinc-400 hover:text-white"
              >
                Fermer
              </button>
            </div>

            <p className="text-xs sm:text-sm text-zinc-100 leading-relaxed">
              {agentReply}
            </p>

            {lastAction && lastAction.type !== "NONE" && (
              <div className="pt-1 flex items-center gap-2 text-[11px] font-medium text-[#30D158]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="tabular-nums">
                  {lastAction.type === "ADD_EXPENSE" &&
                    `Action appliquée : -${formatEUR(lastAction.amount)} dans ${lastAction.envelopeName}`}
                  {lastAction.type === "ADD_INCOME" &&
                    `Action appliquée : +${formatEUR(lastAction.amount)} (${lastAction.label})`}
                  {lastAction.type === "CONSUME_BATCH_MEAL" &&
                    `Action appliquée : -1 portion (${lastAction.mealTitle}) • +${formatEUR(lastAction.savedAmount)} économisés`}
                  {lastAction.type === "UPDATE_SAVINGS_TARGET" &&
                    `Action appliquée : Épargne réglée à ${formatEUR(lastAction.newSavingsTarget)}`}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1-TAP MAGIC ACTION CHIPS (NO TYPING REQUIRED) */}
      <div className="mt-3.5 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={APPLE_SPRING}
          type="button"
          onClick={() => sendToAgent("Bilan du jour")}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/[0.08] text-xs font-medium text-zinc-200"
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#30D158]" />
          <span>Bilan du jour</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={APPLE_SPRING}
          type="button"
          onClick={() => sendToAgent("Que manger ce soir ?")}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/[0.08] text-xs font-medium text-zinc-200"
        >
          <Utensils className="w-3.5 h-3.5 text-[#64D2FF]" />
          <span>Que manger ce soir ?</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={APPLE_SPRING}
          type="button"
          onClick={() => sendToAgent("Courses 22€ Lidl")}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/[0.08] text-xs font-medium text-zinc-200 tabular-nums"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-[#FF9F0A]" />
          <span>+22€ Courses Lidl</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={APPLE_SPRING}
          type="button"
          onClick={() => sendToAgent("J'ai mangé 1 portion du frigo")}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/[0.08] text-xs font-medium text-zinc-200"
        >
          <span>🍲 -1 Portion Frigo</span>
        </motion.button>
      </div>

      {/* NATURAL LANGUAGE COMMAND INPUT BAR */}
      <form onSubmit={handleFormSubmit} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={killSwitchActive || !envAgentEnabled}
          placeholder={
            killSwitchActive
              ? "Kill Switch actif (Agent désactivé)..."
              : "Dis à l'agent : « Café 3.50€ », « Courses 28€ », « Épargne 650€ »..."
          }
          className="flex-1 px-4 py-2.5 rounded-2xl bg-[#121214] border border-white/[0.08] text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#0A84FF] disabled:opacity-50"
        />
        <motion.button
          whileTap={{ scale: 0.94 }}
          transition={APPLE_SPRING}
          type="submit"
          disabled={isLoading || !input.trim() || killSwitchActive}
          className="px-4 py-2.5 rounded-2xl bg-[#0A84FF] hover:bg-[#0A84FF]/90 disabled:opacity-40 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-[#0A84FF]/20"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isLoading ? "..." : "Demander"}</span>
        </motion.button>
      </form>

      {/* EDUCATIONAL & HUGGING FACE TOKEN DRAWER */}
      <AnimatePresence>
        {showLearnDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={APPLE_SPRING}
            className="mt-4 pt-4 border-t border-white/[0.08] space-y-3 overflow-hidden text-xs"
          >
            <div className="p-3 rounded-2xl bg-[#121214] border border-white/[0.06] space-y-2">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#30D158]" />
                <span>
                  Comment fonctionne ton Agent Gratuit (Hugging Face + Vercel) :
                </span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-300 text-[11px] leading-relaxed">
                <li>
                  <strong>Sans token (par défaut) :</strong> L&apos;agent utilise
                  le moteur local intelligent dans{" "}
                  <code className="text-[#64D2FF]">/api/agent/route.ts</code> (0
                  latence, 100% gratuit).
                </li>
                <li>
                  <strong>Avec ton token gratuit Hugging Face :</strong> Crée un
                  token gratuit (sans carte bancaire) sur{" "}
                  <code className="text-[#64D2FF]">
                    huggingface.co/settings/tokens
                  </code>{" "}
                  et colle-le ci-dessous ou dans Vercel (
                  <code className="text-[#30D158]">HUGGINGFACE_API_KEY</code>) pour
                  activer le modèle <strong>Qwen/Qwen2.5-7B-Instruct</strong>.
                </li>
                <li>
                  <strong>Kill Switch Triple Sécurité :</strong> Bouton{" "}
                  <em>Agent ON / Kill Switch</em> + limite de {DAILY_FREE_LIMIT}{" "}
                  appels/jour + variable{" "}
                  <code className="text-[#FF9F0A]">
                    NEXT_PUBLIC_ENABLE_AI_AGENT
                  </code>
                  .
                </li>
              </ol>

              <form
                onSubmit={handleSaveToken}
                className="pt-2 flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="password"
                  value={customHfToken}
                  onChange={(e) => setCustomHfToken(e.target.value)}
                  placeholder="Optionnel : Colle ton token gratuit hf_xxxx ici..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[#1C1C1E] border border-white/[0.1] text-xs text-white font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-[#30D158] text-[#121214] font-bold text-xs"
                >
                  {tokenSavedFeedback ? "✅ Enregistré !" : "Sauvegarder Token"}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
