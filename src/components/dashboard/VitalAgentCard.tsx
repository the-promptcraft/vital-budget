"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatEUR } from "@/lib/utils";
import {
  ArrowUp,
  Bell,
  BellRing,
  CalendarPlus,
  Check,
  ChefHat,
  Clock,
  Download,
  KeyRound,
  Mic,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import type {
  AgentContextPayload,
  AgentPersona,
  AgentResponsePayload,
  AgentActionType,
} from "@/app/api/agent/route";

const DAILY_FREE_LIMIT = 40;
const STORAGE_KEY_KILL_SWITCH = "vital_agent_kill_switch_v1";
const STORAGE_KEY_DAILY_COUNT = "vital_agent_daily_count_v1";
const STORAGE_KEY_HF_TOKEN = "vital_agent_hf_token_v1";

const APPLE_SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

export interface SavedAgendaEvent {
  id: string;
  title: string;
  dateLabel: string;
  startIso: string;
  endIso: string;
  googleCalendarUrl: string;
  description: string;
}

function downloadIcsFile(ev: {
  title: string;
  startIso: string;
  endIso: string;
  description: string;
}) {
  const fmt = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kora//AI Agent//FR",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(ev.startIso)}`,
    `DTEND:${fmt(ev.endIso)}`,
    `SUMMARY:${ev.title}`,
    `DESCRIPTION:${ev.description.replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ev.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function triggerNativeNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
      });
    } catch {}
  }
}

export function VitalAgentCard() {
  const {
    monthlyIncome,
    savingsTarget,
    envelopes,
    fixedExpenses,
    transactions,
    batchMeals,
    agentPersona: activePersona,
    agentReply,
    agentChatHistory: chatHistory,
    agentLastAction: lastAction,
    agentLastProvider: lastProvider,
    savedAgendaEvents: savedEvents,
    setAgentPersona: setActivePersona,
    setAgentTurnState,
    addSavedAgendaEvent,
    removeSavedAgendaEvent,
    setDisposableBalance,
    addTransaction,
    deleteTransaction,
    consumeBatchPortion,
    addBatchMeal,
    addCustomGroceryItem,
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

  const [notifPermission, setNotifPermission] = useState<string>(() => {
    if (typeof window === "undefined" || !("Notification" in window))
      return "default";
    return Notification.permission;
  });

  const [tokenSavedFeedback, setTokenSavedFeedback] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showHfDrawer, setShowHfDrawer] = useState(false);

  const startVoiceDictation = () => {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRec) {
      setAgentTurnState({
        reply:
          "La dictée vocale est disponible sur Safari (iPhone/Mac) et Chrome.",
      });
      return;
    }
    try {
      const recognition = new (SpeechRec as new () => {
        lang: string;
        interimResults: boolean;
        onstart: () => void;
        onend: () => void;
        onresult: (ev: {
          results: { 0: { 0: { transcript: string } } };
        }) => void;
        start: () => void;
      })();
      recognition.lang = "fr-FR";
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || "";
        if (transcript.trim()) {
          sendToAgent(transcript.trim());
        }
      };
      recognition.start();
    } catch {
      setIsListening(false);
    }
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

  // Automatic DLC & Container Alerts generated by the Nutritionist Agent
  const dlcContainerAlerts = useMemo(() => {
    const alerts: {
      id: string;
      mealId: string;
      title: string;
      emoji: string;
      remainingPortions: number;
      shelfDays: number;
      urgencyLabel: string;
      isUrgent: boolean;
      savedPerMeal: number;
    }[] = [];

    for (const m of batchMeals) {
      if (m.remainingPortions <= 0) continue;
      const shelfDays = m.shelfLifeDays || 3;
      const saved = Number((m.externalMealPrice - m.costPerPortion).toFixed(2));
      const isUrgent = shelfDays <= 2 || m.remainingPortions >= 3;
      alerts.push({
        id: m.id,
        mealId: m.id,
        title: m.title,
        emoji: m.emoji,
        remainingPortions: m.remainingPortions,
        shelfDays,
        urgencyLabel:
          shelfDays <= 2
            ? `DLC courte (${shelfDays}j) • À consommer en priorité`
            : `DLC ${shelfDays} jours • ${m.remainingPortions} boîtes prêtes`,
        isUrgent,
        savedPerMeal: saved,
      });
    }
    return alerts;
  }, [batchMeals]);

  const requestPhoneNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === "granted") {
        triggerNativeNotification(
          "Kora — Alertes DLC & Budget activées ✅",
          `Tu recevras tes rappels de boîtes Batch Cooking et de budget (${formatEUR(dailyBudgetAllowed)}/jour).`
        );
      }
    } catch {}
  };

  const toggleKillSwitch = () => {
    const next = !killSwitchActive;
    setKillSwitchActive(next);
    try {
      localStorage.setItem(STORAGE_KEY_KILL_SWITCH, String(next));
    } catch {}
    if (next) {
      setAgentTurnState({
        reply: "Kill Switch activé. Les 2 agents sont verrouillés (0,00 €).",
        action: { type: "NONE" },
      });
    } else {
      setAgentTurnState({
        reply: "Agents réactivés. Choisis Kora Flow ou Kora Chef !",
      });
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
      setDisposableBalance(action.targetDisposable);
      triggerNativeNotification(
        "Reste à vivre mis à jour",
        `Nouveau solde disponible : ${formatEUR(action.targetDisposable)}`
      );
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
      triggerNativeNotification(
        "Boîte Batch Cooking consommée 🍲",
        `-1 boîte de ${action.mealTitle} (+${formatEUR(action.savedAmount)} économisés !)`
      );
    } else if (action.type === "ADD_BATCH_MEAL") {
      addBatchMeal({
        title: action.title,
        emoji: action.emoji,
        totalPortions: action.portions,
        remainingPortions: action.portions,
        totalCost: action.totalCost,
        externalMealPrice: 14.5,
        prepTimeMinutes: 35,
        nutriScore: 95,
        vitamins: action.vitamins,
        vegSubFamilies: ["Greens & Cruciferous", "Legumes & Pulses"],
        ingredients: [
          {
            name: action.title,
            quantityLabel: `${action.portions} boîtes`,
            cost: action.totalCost,
          },
        ],
        shelfLifeDays: action.shelfLifeDays,
      });
      triggerNativeNotification(
        `Batch créé : ${action.portions} boîtes de ${action.title}`,
        `DLC calculée : ${action.shelfLifeDays} jours au frigo.`
      );
    } else if (action.type === "GENERATE_WEEKLY_GROCERIES") {
      for (const item of action.items) {
        addCustomGroceryItem({
          name: item.name,
          emoji: item.emoji,
          family: "Veggies & Vitamins",
          price: item.price,
          quantity: item.quantity,
          unit: item.unit,
          vitamins: item.vitamins,
        });
      }
      triggerNativeNotification(
        "Panier Courses Hebdo généré 🛒",
        `${action.items.length} produits essentiels ajoutés (${formatEUR(action.totalEstimated)}).`
      );
    } else if (action.type === "CREATE_CALENDAR_EVENT") {
      const newEv: SavedAgendaEvent = {
        id: `ev-${Date.now()}`,
        title: action.title,
        dateLabel: action.dateLabel,
        startIso: action.startIso,
        endIso: action.endIso,
        googleCalendarUrl: action.googleCalendarUrl,
        description: action.description,
      };
      addSavedAgendaEvent(newEv);
      // Automatically open Google Calendar in a new tab so the user doesn't miss it!
      if (typeof window !== "undefined") {
        window.open(action.googleCalendarUrl, "_blank", "noopener,noreferrer");
      }
      triggerNativeNotification(
        `Ajouté à l'Agenda : ${action.title}`,
        action.dateLabel
      );
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

  const sendToAgent = async (
    commandText: string,
    overridePersona?: AgentPersona
  ) => {
    const trimmed = commandText.trim();
    if (!trimmed || isLoading) return;

    const targetPersona = overridePersona || activePersona;
    if (overridePersona && overridePersona !== activePersona) {
      setActivePersona(overridePersona);
    }

    if (!envAgentEnabled || killSwitchActive) {
      setAgentTurnState({
        reply:
          "Le Kill Switch est activé. Réactive le bouton en haut à droite pour parler aux agents.",
        action: { type: "NONE" },
      });
      return;
    }

    if (dailyCallsUsed >= DAILY_FREE_LIMIT) {
      setAgentTurnState({
        reply: `Limite quotidienne atteinte (${DAILY_FREE_LIMIT}/${DAILY_FREE_LIMIT} entrées aujourd'hui • 0,00 €). Réinitialisation à minuit.`,
      });
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
        totalPortions: m.totalPortions,
        costPerPortion: m.costPerPortion,
        externalMealPrice: m.externalMealPrice,
        shelfLifeDays: m.shelfLifeDays,
        lastCookedAt: m.lastCookedAt,
      })),
    };

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          persona: targetPersona,
          context: contextPayload,
          history: chatHistory,
          hfToken: customHfToken,
          killSwitch: killSwitchActive,
        }),
      });

      const data: AgentResponsePayload = await res.json();
      incrementDailyCounter();

      if (data.action && data.action.type !== "NONE") {
        executeAgentAction(data.action);
      }

      setAgentTurnState({
        reply: data.reply,
        action: data.action,
        provider: data.provider,
        userMessage: trimmed,
      });
    } catch {
      setAgentTurnState({
        reply: "Une erreur réseau est survenue, réessaie.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendToAgent(input);
  };

  const removeSavedEvent = (id: string) => {
    removeSavedAgendaEvent(id);
  };

  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={APPLE_SPRING}
        className="apple-titanium-card relative rounded-[28px] p-4 sm:p-5 overflow-hidden"
      >
        {/* Living Apple Intelligence Multi-Color Aura Bar */}
        <div
          aria-hidden="true"
          className="apple-intelligence-border pointer-events-none absolute inset-x-0 top-0 h-1.5"
        />

        {/* Top Bar: Controls & Kill Switch */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <motion.div
              animate={
                isLoading
                  ? { rotate: 360, scale: [1, 1.14, 1] }
                  : { rotate: 0, scale: [1, 1.04, 1] }
              }
              transition={
                isLoading
                  ? { repeat: Infinity, duration: 2, ease: "linear" }
                  : { repeat: Infinity, duration: 4.5, ease: "easeInOut" }
              }
              className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-md ${
                activePersona === "finance"
                  ? "siri-orb shadow-[#0071E3]/30"
                  : "bg-gradient-to-br from-[#10B981] via-[#059669] to-[#0071E3] shadow-emerald-500/30"
              }`}
            >
              {activePersona === "finance" ? (
                <Sparkles className="w-4 h-4 drop-shadow-sm" />
              ) : (
                <ChefHat className="w-4 h-4 drop-shadow-sm" />
              )}
            </motion.div>
            <div>
              <span className="text-xs font-bold text-[#0F172A] tracking-tight block">
                {activePersona === "finance"
                  ? "Kora Flow • Concierge Financier & Agenda"
                  : "Kora Chef • Nutritionniste, Courses & DLC"}
              </span>
              <span className="text-[11px] text-[#64748B] tabular-nums">
                {dailyCallsUsed}/{DAILY_FREE_LIMIT} entrées gratuites • 0,00 €
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={requestPhoneNotificationPermission}
              className={`apple-glass-pill px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors ${
                notifPermission === "granted"
                  ? "text-emerald-700"
                  : "text-[#0F172A] hover:bg-white"
              }`}
              title="Activer les notifications natives sur ce téléphone / Mac"
            >
              {notifPermission === "granted" ? (
                <>
                  <BellRing className="w-3 h-3 text-emerald-600" />
                  <span className="hidden sm:inline">Alertes actives</span>
                </>
              ) : (
                <>
                  <Bell className="w-3 h-3 text-[#0071E3]" />
                  <span>Notifs</span>
                </>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={() => setShowHfDrawer(!showHfDrawer)}
              className="apple-glass-pill px-2.5 py-1 rounded-full text-[11px] font-medium text-[#0F172A] hover:bg-white transition-colors flex items-center gap-1"
            >
              <KeyRound className="w-3 h-3 text-[#0071E3]" />
              <span>
                {customHfToken.startsWith("hf_") ? "HF Connecté" : "Clé HF"}
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
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
                  <span>0,00 €</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* DUAL-AGENT SEGMENTED SWITCHER (APPLE LIQUID GLASS PILL) */}
        <div className="mt-3.5 grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-900/[0.05] border border-white/80">
          <button
            type="button"
            onClick={() => setActivePersona("finance")}
            className={`relative py-2 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 z-10 ${
              activePersona === "finance"
                ? "text-[#0F172A]"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            {activePersona === "finance" && (
              <motion.span
                layoutId="dualAgentSegmentedPill"
                transition={APPLE_SPRING}
                className="absolute inset-0 rounded-xl bg-white shadow-sm border border-black/[0.04] -z-10"
              />
            )}
            <Wallet className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Kora Flow (Budget &amp; Agenda)</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePersona("nutrition")}
            className={`relative py-2 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 z-10 ${
              activePersona === "nutrition"
                ? "text-[#0F172A]"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            {activePersona === "nutrition" && (
              <motion.span
                layoutId="dualAgentSegmentedPill"
                transition={APPLE_SPRING}
                className="absolute inset-0 rounded-xl bg-white shadow-sm border border-black/[0.04] -z-10"
              />
            )}
            <ChefHat className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kora Chef (Courses &amp; DLC)</span>
          </button>
        </div>

        {/* Frosted Command Composer */}
        <form onSubmit={handleFormSubmit} className="mt-3.5 relative">
          <div className="relative flex items-center rounded-2xl bg-white/95 border border-slate-200/90 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus-within:border-[#0071E3] focus-within:ring-4 focus-within:ring-[#0071E3]/12 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={killSwitchActive || !envAgentEnabled}
              placeholder={
                killSwitchActive
                  ? "Agents verrouillés (Kill Switch actif)..."
                  : activePersona === "finance"
                  ? "Demande à Kora Flow : « J'ai pas 400 mais 359€ », « Mets sur Google Agenda demain 18h »..."
                  : "Demande à Kora Chef : « Conseille mes courses de la semaine », « J'ai cuisiné 5 boîtes de curry »..."
              }
              className="w-full bg-transparent pl-4 pr-22 py-3.5 text-xs sm:text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none disabled:opacity-40"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                transition={APPLE_SPRING}
                type="button"
                onClick={startVoiceDictation}
                disabled={killSwitchActive || !envAgentEnabled}
                aria-label="Dictée vocale"
                title="Dicter à la voix (Français)"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isListening
                    ? "bg-red-500 text-white shadow-md shadow-red-500/30 animate-pulse"
                    : "apple-glass-pill text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <Mic className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                transition={APPLE_SPRING}
                type="submit"
                disabled={isLoading || !input.trim() || killSwitchActive}
                aria-label="Envoyer"
                className={`w-9 h-9 rounded-xl text-white disabled:opacity-30 flex items-center justify-center shadow-md transition-all ${
                  activePersona === "finance"
                    ? "bg-gradient-to-b from-[#0077ED] to-[#0062CC] shadow-[#0071E3]/25"
                    : "bg-gradient-to-b from-[#10B981] to-[#059669] shadow-emerald-500/25"
                }`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                )}
              </motion.button>
            </div>
          </div>
        </form>

        {/* Contextual Quick Action Pills per Agent */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {activePersona === "finance" ? (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() =>
                  sendToAgent(
                    "Le dashboard est pas bon, j'ai pas 400 mais 359 eur",
                    "finance"
                  )
                }
                className="apple-glass-pill shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold text-[#0F172A] hover:bg-white transition-colors tabular-nums"
              >
                ✨ Corriger solde → 359 €
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() =>
                  sendToAgent(
                    "Mets sur mon Google Agenda : Batch Cooking demain à 18h",
                    "finance"
                  )
                }
                className="apple-glass-pill shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold text-[#0F172A] hover:bg-white transition-colors flex items-center gap-1"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>Ajouter à Google Agenda</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => sendToAgent("Courses 22€ Lidl", "finance")}
                className="apple-glass-pill shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold text-[#0F172A] hover:bg-white transition-colors tabular-nums"
              >
                💳 +22 € Courses
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() =>
                  sendToAgent("Annule la dernière dépense", "finance")
                }
                className="apple-glass-pill shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold text-[#0F172A] hover:bg-white transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3 text-[#64748B]" />
                <span>Annuler dernière</span>
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() =>
                  sendToAgent(
                    "Je vais faire des courses pour toute la semaine, tu me conseilles d'acheter quoi ?",
                    "nutrition"
                  )
                }
                className="apple-glass-pill shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold text-emerald-800 hover:bg-white transition-colors flex items-center gap-1"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Panier Courses Semaine Auto</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() =>
                  sendToAgent(
                    "J'ai cuisiné 5 boîtes de Poulet Curry & Riz pour 12€",
                    "nutrition"
                  )
                }
                className="apple-glass-pill shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold text-[#0F172A] hover:bg-white transition-colors"
              >
                🍲 Nouveau Batch (5 boîtes + DLC auto)
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() =>
                  sendToAgent("J'ai mangé 1 portion du frigo", "nutrition")
                }
                className="apple-glass-pill shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold text-[#0F172A] hover:bg-white transition-colors"
              >
                🥢 -1 Boîte Frigo
              </motion.button>
            </>
          )}
        </div>

        {/* Agent Response & Rich Interactive Cards */}
        <AnimatePresence mode="wait">
          {agentReply && (
            <motion.div
              key={agentReply}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={APPLE_SPRING}
              className="mt-4 p-4 rounded-2xl bg-white/95 border border-white shadow-md space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {activePersona === "nutrition" ? (
                    <ChefHat className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-[#0071E3] mt-0.5 shrink-0" />
                  )}
                  <p className="text-xs sm:text-[13px] text-[#0F172A] font-medium leading-relaxed">
                    {agentReply}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAgentTurnState({ reply: null })}
                  className="text-[#94A3B8] hover:text-[#0F172A] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* GOOGLE AGENDA + APPLE CALENDAR (.ICS) INTERACTIVE CARD */}
              {lastAction && lastAction.type === "CREATE_CALENDAR_EVENT" && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/60 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0071E3] block">
                        Synchronisation Agenda Prête
                      </span>
                      <p className="text-xs font-bold text-[#0F172A]">
                        {lastAction.title}
                      </p>
                      <p className="text-[11px] text-[#475569]">
                        📅 {lastAction.dateLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={lastAction.googleCalendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-[#0071E3] text-white hover:bg-[#0077ED] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>Ajouter dans Google Agenda</span>
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        downloadIcsFile({
                          title: lastAction.title,
                          startIso: lastAction.startIso,
                          endIso: lastAction.endIso,
                          description: lastAction.description,
                        })
                      }
                      className="px-3 py-2 rounded-xl bg-white text-[#0F172A] hover:bg-slate-50 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#0071E3]" />
                      <span>Calendrier Apple / iPhone (.ics)</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* BATCH COOKING CONTAINER + DLC PLANNER CARD */}
              {lastAction && lastAction.type === "ADD_BATCH_MEAL" && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/70 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-900">
                      {lastAction.emoji} {lastAction.portions} Boîtes créées •
                      DLC auto : {lastAction.shelfLifeDays} jours
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 tabular-nums">
                      {formatEUR(lastAction.totalCost / lastAction.portions)} /
                      boîte
                    </span>
                  </div>
                  <div className="space-y-1">
                    {lastAction.containerPlan.map((line, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-emerald-950 bg-white/80 px-2.5 py-1.5 rounded-xl border border-emerald-200/50 flex items-center justify-between"
                      >
                        <span>{line}</span>
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* WEEKLY GROCERY BASKET CONFIRMATION */}
              {lastAction &&
                lastAction.type === "GENERATE_WEEKLY_GROCERIES" && (
                  <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                      <span>
                        🛒 {lastAction.items.length} produits ajoutés à ton
                        onglet Courses
                      </span>
                      <span className="tabular-nums text-emerald-700">
                        Total : {formatEUR(lastAction.totalEstimated)}
                      </span>
                    </div>
                  </div>
                )}

              {/* Confirmation badge for other actions */}
              {lastAction &&
                lastAction.type !== "NONE" &&
                lastAction.type !== "CREATE_CALENDAR_EVENT" &&
                lastAction.type !== "ADD_BATCH_MEAL" &&
                lastAction.type !== "GENERATE_WEEKLY_GROCERIES" && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold pt-0.5">
                    <span className="flex items-center gap-1.5 tabular-nums">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      {lastAction.type === "SET_DISPOSABLE_LEFT" &&
                        `Reste à vivre ajusté à ${formatEUR(lastAction.targetDisposable)}`}
                      {lastAction.type === "SET_MONTHLY_INCOME" &&
                        `Revenu mensuel ajusté à ${formatEUR(lastAction.newIncome)}`}
                      {lastAction.type === "UNDO_LAST_TRANSACTION" &&
                        `Opération annulée : ${lastAction.txLabel} (${formatEUR(lastAction.txAmount)})`}
                      {lastAction.type === "ADD_EXPENSE" &&
                        `Ajouté : -${formatEUR(lastAction.amount)} (${lastAction.envelopeName})`}
                      {lastAction.type === "ADD_INCOME" &&
                        `Ajouté : +${formatEUR(lastAction.amount)} (${lastAction.label})`}
                      {lastAction.type === "CONSUME_BATCH_MEAL" &&
                        `-1 boîte (${lastAction.mealTitle}) • +${formatEUR(lastAction.savedAmount)} économisés`}
                      {lastAction.type === "UPDATE_SAVINGS_TARGET" &&
                        `Épargne ajustée à ${formatEUR(lastAction.newSavingsTarget)}`}
                      {lastAction.type === "UPDATE_ENVELOPE_BUDGET" &&
                        `Enveloppe ${lastAction.envelopeName} mise à jour`}
                    </span>
                    <span className="text-[10px] text-[#64748B]">
                      {lastProvider === "huggingface-qwen2.5"
                        ? "Qwen 2.5 HF"
                        : "LLM 20B Gratuit"}
                    </span>
                  </div>
                )}
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
              <p className="text-[11px] text-[#475569] leading-relaxed">
                <strong className="text-[#0F172A]">
                  LLM 20B Gratuit actif par défaut !
                </strong>{" "}
                Tu peux aussi connecter ton propre token gratuit Hugging Face (
                <code className="text-[#0071E3]">Qwen/Qwen2.5-7B-Instruct</code>
                ) ci-dessous :
              </p>
              <form onSubmit={handleSaveToken} className="flex gap-2">
                <input
                  type="password"
                  value={customHfToken}
                  onChange={(e) => setCustomHfToken(e.target.value)}
                  placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-[#0F172A] font-mono focus:outline-none focus:border-[#0071E3]"
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

      {/* IN-APP NOTIFICATION CENTER : CONTAINERS DLC & GOOGLE AGENDA TIMELINE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Card A: Containers & Alertes DLC */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...APPLE_SPRING, delay: 0.05 }}
          className="apple-glass rounded-3xl p-4 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Boîtes Frigo & Alertes DLC</span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 tabular-nums">
              {dlcContainerAlerts.reduce((s, a) => s + a.remainingPortions, 0)}{" "}
              boîtes
            </span>
          </div>

          {dlcContainerAlerts.length === 0 ? (
            <p className="text-xs text-[#64748B] py-2">
              Aucune boîte au frigo. Dis au Nutritionniste : « J&apos;ai cuisiné
              4 boîtes de curry » !
            </p>
          ) : (
            <div className="space-y-2">
              {dlcContainerAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="p-2.5 rounded-2xl bg-white/80 border border-white flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#0F172A] truncate">
                      {alert.emoji} {alert.title}
                    </p>
                    <p
                      className={`text-[10px] font-medium ${
                        alert.isUrgent ? "text-amber-600" : "text-emerald-700"
                      }`}
                    >
                      {alert.urgencyLabel}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    type="button"
                    onClick={() =>
                      sendToAgent(
                        `J'ai mangé 1 portion de ${alert.title}`,
                        "nutrition"
                      )
                    }
                    className="shrink-0 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 text-[11px] font-semibold tabular-nums transition-colors"
                  >
                    -1 boîte
                  </motion.button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Card B: Mon Agenda & Rappels Synchronisés */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...APPLE_SPRING, delay: 0.1 }}
          className="apple-glass rounded-3xl p-4 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
              <CalendarPlus className="w-3.5 h-3.5 text-[#0071E3]" />
              <span>Mon Agenda & Rappels</span>
            </span>
            <button
              type="button"
              onClick={() =>
                sendToAgent(
                  "Mets sur mon Google Agenda : Batch Cooking demain à 18h",
                  "finance"
                )
              }
              className="text-[11px] font-semibold text-[#0071E3] hover:underline"
            >
              + Planifier
            </button>
          </div>

          {savedEvents.length === 0 ? (
            <p className="text-xs text-[#64748B] py-2">
              Dis à l&apos;agent : « Mets sur mon Google Agenda courses demain à
              14h » pour synchroniser ton calendrier.
            </p>
          ) : (
            <div className="space-y-2">
              {savedEvents.slice(0, 3).map((ev) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-2xl bg-white/80 border border-white flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#0F172A] truncate">
                      {ev.title}
                    </p>
                    <p className="text-[10px] text-[#64748B] truncate">
                      {ev.dateLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={ev.googleCalendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded-lg bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] text-[10px] font-semibold"
                    >
                      Google
                    </a>
                    <button
                      type="button"
                      onClick={() => downloadIcsFile(ev)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-[10px] font-semibold"
                      title="Télécharger pour Apple Calendar"
                    >
                      .ics
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSavedEvent(ev.id)}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
