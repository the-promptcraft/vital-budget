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
  ChatTurn,
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
    updateEnvelopeSpent,
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
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [lastAction, setLastAction] = useState<AgentActionType | null>(null);
  const [lastProvider, setLastProvider] = useState<string>("free-cloud-llm-20b");
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
        subtitle: `Économise ${saved} € ce soir.`,
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
      setAgentReply("Agent actif. Dis-moi ce que tu veux modifier ou noter !");
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

  const executeAgentAction = (action: AgentActionType) => {
    if (!action || action.type === "NONE") return;

    const todayYmd = new Date().toISOString().split("T")[0];

    if (action.type === "SET_DISPOSABLE_LEFT") {
      const newRequiredIncome = Number(
        (
          action.targetDisposable +
          totalFixed +
          savingsTarget +
          totalVariableSpent
        ).toFixed(2)
      );
      updateBudgetTargets(newRequiredIncome, savingsTarget);
    } else if (action.type === "SET_MONTHLY_INCOME") {
      updateBudgetTargets(action.newIncome, savingsTarget);
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
      if (action.newAllocated !== undefined) {
        updateEnvelopeAllocation(action.envelopeId, action.newAllocated);
      }
      if (action.newSpent !== undefined) {
        updateEnvelopeSpent(action.envelopeId, action.newSpent);
      }
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
          history: chatHistory,
          hfToken: customHfToken,
          killSwitch: killSwitchActive,
        }),
      });

      const data: AgentResponsePayload = await res.json();
      incrementDailyCounter();
      setAgentReply(data.reply);
      setLastAction(data.action);
      setLastProvider(data.provider);
      setChatHistory((prev) => [
        ...prev.slice(-6),
        { role: "user", content: trimmed },
        { role: "assistant", content: data.reply },
      ]);

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
      className="apple-glass relative rounded-3xl p-4 sm:p-5 overflow-hidden"
    >
      {/* Subtle Apple Intelligence Pastel Top Shimmer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0071E3]/40 via-[#AF52DE]/40 to-[#34C759]/40"
      />

      {/* Top Bar: Apple Glass Status + Kill Switch */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#0071E3] to-[#5856D6] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[#1D1D1F] tracking-tight">
              Vital Intelligence
            </span>
            <span className="text-[11px] text-[#6E6E73] tabular-nums ml-1.5">
              • {dailyCallsUsed}/{DAILY_FREE_LIMIT} entrées
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowHfDrawer(!showHfDrawer)}
            className="apple-glass-pill px-2.5 py-1 rounded-full text-[11px] font-medium text-[#1D1D1F] hover:bg-white transition-colors flex items-center gap-1"
          >
            <KeyRound className="w-3 h-3 text-[#0071E3]" />
            <span>
              {customHfToken.startsWith("hf_") ? "HF Connecté" : "Clé HF"}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleKillSwitch}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
              killSwitchActive || !envAgentEnabled
                ? "bg-red-500/10 text-red-600 border-red-500/20"
                : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15"
            }`}
          >
            {killSwitchActive || !envAgentEnabled ? (
              <>
                <ShieldAlert className="w-3 h-3 text-red-600" />
                <span>Off</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>100% Gratuit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Apple Frosted Glass Command Input */}
      <form onSubmit={handleFormSubmit} className="mt-3.5 relative">
        <div className="relative flex items-center rounded-2xl bg-white/85 border border-black/[0.08] shadow-inner focus-within:border-[#0071E3] focus-within:ring-2 focus-within:ring-[#0071E3]/15 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={killSwitchActive || !envAgentEnabled}
            placeholder={
              killSwitchActive
                ? "Assistant verrouillé (Kill Switch actif)..."
                : "Parle librement : « J'ai pas 400 mais 359€ », « Courses 22€ », « Mets sur Google Agenda... »"
            }
            className="w-full bg-transparent pl-4 pr-12 py-3 text-xs sm:text-sm text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none disabled:opacity-40"
          />
          <motion.button
            whileTap={{ scale: 0.92 }}
            transition={APPLE_SPRING}
            type="submit"
            disabled={isLoading || !input.trim() || killSwitchActive}
            aria-label="Envoyer à l'agent"
            className="absolute right-2 w-8 h-8 rounded-xl bg-[#0071E3] text-white hover:bg-[#0077ED] disabled:opacity-30 flex items-center justify-center shadow-sm shadow-[#0071E3]/25 transition-opacity"
          >
            {isLoading ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4 stroke-[2.4]" />
            )}
          </motion.button>
        </div>
      </form>

      {/* Apple Glass Quick Suggestion Pills */}
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() =>
            sendToAgent("Le dashboard est pas bon, j'ai pas 400 mais 359 eur")
          }
          className="apple-glass-pill shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium text-[#1D1D1F] hover:bg-white transition-colors tabular-nums"
        >
          ✨ Corriger solde → 359 €
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() =>
            sendToAgent("Mets sur mon Google Agenda : Batch Cooking demain à 18h")
          }
          className="apple-glass-pill shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium text-[#1D1D1F] hover:bg-white transition-colors flex items-center gap-1"
        >
          <CalendarPlus className="w-3 h-3 text-[#0071E3]" />
          <span>Google Agenda</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => sendToAgent("Courses 22€ Lidl")}
          className="apple-glass-pill shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium text-[#1D1D1F] hover:bg-white transition-colors tabular-nums"
        >
          🛒 +22 € Courses
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => sendToAgent("J'ai mangé 1 portion du frigo")}
          className="apple-glass-pill shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium text-[#1D1D1F] hover:bg-white transition-colors"
        >
          🍲 -1 Portion Frigo
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => sendToAgent("Annule la dernière dépense")}
          className="apple-glass-pill shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium text-[#1D1D1F] hover:bg-white transition-colors flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3 text-[#6E6E73]" />
          <span>Annuler dernière</span>
        </motion.button>
      </div>

      {/* Agent Reply Bubble (Frosted Glass) */}
      <AnimatePresence mode="wait">
        {agentReply && (
          <motion.div
            key={agentReply}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={APPLE_SPRING}
            className="mt-3.5 p-3.5 rounded-2xl bg-white/85 border border-black/[0.06] shadow-xs space-y-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#0071E3] mt-0.5 shrink-0" />
                <p className="text-xs sm:text-[13px] text-[#1D1D1F] leading-relaxed">
                  {agentReply}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAgentReply(null)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 1-Click Google Calendar Button */}
            {lastAction && lastAction.type === "CREATE_CALENDAR_EVENT" && (
              <div className="pt-1 flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#F2F4F8] border border-black/[0.06]">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#1D1D1F] truncate">
                    {lastAction.title}
                  </p>
                  <p className="text-[11px] text-[#6E6E73]">
                    {lastAction.dateLabel}
                  </p>
                </div>
                <a
                  href={lastAction.googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-[#0071E3] text-white hover:bg-[#0077ED] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Ouvrir Google Agenda</span>
                </a>
              </div>
            )}

            {/* Confirmation badge for store modifications */}
            {lastAction &&
              lastAction.type !== "NONE" &&
              lastAction.type !== "CREATE_CALENDAR_EVENT" && (
                <div className="flex items-center justify-between text-[11px] text-emerald-700 font-medium pt-0.5">
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    {lastAction.type === "SET_DISPOSABLE_LEFT" &&
                      `Reste à vivre ajusté à ${formatEUR(lastAction.targetDisposable)}`}
                    {lastAction.type === "SET_MONTHLY_INCOME" &&
                      `Revenu mensuel ajusté à ${formatEUR(lastAction.newIncome)}`}
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
                    {lastAction.type === "UPDATE_ENVELOPE_BUDGET" &&
                      `Enveloppe ${lastAction.envelopeName} mise à jour`}
                  </span>
                  <span className="text-[10px] text-[#86868B]">
                    {lastProvider === "huggingface-qwen2.5"
                      ? "Qwen 2.5 HF"
                      : lastProvider === "free-cloud-llm-20b"
                      ? "LLM 20B Gratuit"
                      : "Moteur local"}
                  </span>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proactive Suggestion Strip */}
      <AnimatePresence>
        {smartNotifications.length > 0 && !agentReply && !killSwitchActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 pt-3 border-t border-black/[0.06] flex items-center justify-between gap-2"
          >
            <p className="text-[11px] text-[#6E6E73] truncate">
              💡 <strong className="text-[#1D1D1F]">{smartNotifications[0].title}</strong> —{" "}
              {smartNotifications[0].subtitle}
            </p>
            <button
              type="button"
              onClick={() => sendToAgent(smartNotifications[0].ctaCommand)}
              className="shrink-0 text-[11px] font-semibold text-[#0071E3] hover:underline"
            >
              {smartNotifications[0].ctaLabel} →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hugging Face Token Drawer */}
      <AnimatePresence>
        {showHfDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={APPLE_SPRING}
            className="mt-3.5 pt-3.5 border-t border-black/[0.06] overflow-hidden space-y-2.5 text-xs"
          >
            <p className="text-[11px] text-[#6E6E73] leading-relaxed">
              <strong className="text-[#1D1D1F]">
                Vrai LLM 20B Gratuit déjà actif !
              </strong>{" "}
              L&apos;assistant utilise dès maintenant un grand modèle de langage
              20B 100% gratuit sans clé. Si tu souhaites utiliser{" "}
              <code className="text-[#0071E3]">Qwen/Qwen2.5-7B-Instruct</code>{" "}
              via ton propre compte Hugging Face, colle ton token gratuit{" "}
              <code className="text-[#1D1D1F]">hf_...</code> ci-dessous :
            </p>
            <form onSubmit={handleSaveToken} className="flex gap-2">
              <input
                type="password"
                value={customHfToken}
                onChange={(e) => setCustomHfToken(e.target.value)}
                placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-black/[0.1] text-xs text-[#1D1D1F] font-mono focus:outline-none focus:border-[#0071E3]"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-[#0071E3] text-white hover:bg-[#0077ED] font-semibold text-xs transition-colors"
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
