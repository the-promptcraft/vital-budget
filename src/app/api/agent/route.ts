import { NextRequest, NextResponse } from "next/server";

/**
 * ============================================================================
 * 🧠 VITAL AGENT V3 — VRAI LLM 20B GRATUIT SANS CLÉ + HUGGING FACE QWEN 2.5
 * ============================================================================
 * Pourquoi l'agent était limité avant ?
 * - Avant, sans clé Hugging Face (`hf_...`), il utilisait uniquement 6 règles
 *   `if/else` basiques (expressions régulières).
 * - Maintenant, même SANS clé Hugging Face, il appelle un VRAI grand modèle de
 *   langage open-source 100% gratuit et sans compte (`gpt-oss-20b` via
 *   Pollinations OpenAI-compatible router), ou `Qwen/Qwen2.5-7B-Instruct` sur
 *   Hugging Face si tu renseignes un token `hf_...`.
 * - Il garde aussi la mémoire de la conversation (`history`) et peut modifier
 *   n'importe quel chiffre du dashboard + créer des événements Google Agenda !
 * ============================================================================
 */

export interface AgentContextPayload {
  disposableLeft: number;
  dailyBudgetAllowed: number;
  remainingDays: number;
  monthlyIncome: number;
  savingsTarget: number;
  totalFixed: number;
  totalVariableSpent: number;
  lastTransaction?: {
    id: string;
    label: string;
    amount: number;
  } | null;
  envelopes: {
    id: string;
    name: string;
    allocated: number;
    spent: number;
  }[];
  batchMeals: {
    id: string;
    title: string;
    remainingPortions: number;
    costPerPortion: number;
    externalMealPrice: number;
  }[];
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type AgentActionType =
  | {
      type: "ADD_EXPENSE";
      amount: number;
      label: string;
      envelopeId: string;
      envelopeName: string;
    }
  | {
      type: "ADD_INCOME";
      amount: number;
      label: string;
    }
  | {
      type: "SET_DISPOSABLE_LEFT";
      targetDisposable: number;
      previousDisposable: number;
    }
  | {
      type: "SET_MONTHLY_INCOME";
      newIncome: number;
    }
  | {
      type: "UNDO_LAST_TRANSACTION";
      txId: string;
      txLabel: string;
      txAmount: number;
    }
  | {
      type: "CONSUME_BATCH_MEAL";
      mealId: string;
      mealTitle: string;
      savedAmount: number;
    }
  | {
      type: "UPDATE_SAVINGS_TARGET";
      newSavingsTarget: number;
    }
  | {
      type: "UPDATE_ENVELOPE_BUDGET";
      envelopeId: string;
      envelopeName: string;
      newAllocated?: number;
      newSpent?: number;
    }
  | {
      type: "CREATE_CALENDAR_EVENT";
      title: string;
      dateLabel: string;
      googleCalendarUrl: string;
      description: string;
    }
  | {
      type: "NONE";
    };

export interface AgentResponsePayload {
  reply: string;
  action: AgentActionType;
  provider:
    | "huggingface-qwen2.5"
    | "free-cloud-llm-20b"
    | "local-smart-engine"
    | "kill-switch-blocked";
  modelUsed: string;
}

const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
const FREE_KEYLESS_LLM_URL = "https://text.pollinations.ai/openai";
const DEFAULT_HF_MODEL = "Qwen/Qwen2.5-7B-Instruct";

function buildGoogleCalendarUrl(
  title: string,
  description: string,
  daysOffset: number = 1,
  hour: number = 18
): { url: string; dateLabel: string } {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysOffset,
    hour,
    0,
    0
  );
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description,
    dates: `${fmt(start)}/${fmt(end)}`,
  });

  const dateLabel = start.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    url: `https://calendar.google.com/calendar/render?${params.toString()}`,
    dateLabel,
  };
}

export async function POST(req: NextRequest) {
  try {
    // 🛑 LAYER 1 KILL SWITCH
    if (process.env.NEXT_PUBLIC_ENABLE_AI_AGENT === "false") {
      return NextResponse.json<AgentResponsePayload>({
        reply:
          "Kill Switch actif (NEXT_PUBLIC_ENABLE_AI_AGENT=false). Aucun appel externe n'a été effectué.",
        action: { type: "NONE" },
        provider: "kill-switch-blocked",
        modelUsed: "none",
      });
    }

    const body = await req.json();
    const userMessage: string = (body.message || "").trim();
    const context: AgentContextPayload = body.context;
    const history: ChatTurn[] = Array.isArray(body.history) ? body.history : [];
    const clientHfToken: string | undefined = body.hfToken;
    const clientKillSwitch: boolean = Boolean(body.killSwitch);

    if (clientKillSwitch) {
      return NextResponse.json<AgentResponsePayload>({
        reply: "Kill Switch activé. Zéro requête réseau envoyée.",
        action: { type: "NONE" },
        provider: "kill-switch-blocked",
        modelUsed: "none",
      });
    }

    if (!userMessage) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // 1. Try Hugging Face Qwen 2.5 if user configured an hf_ token
    const apiKey =
      clientHfToken?.trim() || process.env.HUGGINGFACE_API_KEY?.trim();

    if (apiKey && apiKey.startsWith("hf_")) {
      const hfResult = await callCloudLLM(
        userMessage,
        context,
        history,
        HF_ROUTER_URL,
        DEFAULT_HF_MODEL,
        apiKey,
        "huggingface-qwen2.5"
      );
      if (hfResult) {
        return NextResponse.json<AgentResponsePayload>(hfResult);
      }
    }

    // 2. Try 100% Free Keyless Open-Source 20B LLM (Zero account/card needed!)
    const freeCloudResult = await callCloudLLM(
      userMessage,
      context,
      history,
      FREE_KEYLESS_LLM_URL,
      "openai-fast",
      undefined,
      "free-cloud-llm-20b"
    );
    if (freeCloudResult) {
      return NextResponse.json<AgentResponsePayload>(freeCloudResult);
    }

    // 3. Offline instant fallback if user has no internet connection
    const localResult = runSmartLocalAgent(userMessage, context);
    return NextResponse.json<AgentResponsePayload>(localResult);
  } catch (err) {
    console.error("[VitalAgent] Error:", err);
    return NextResponse.json<AgentResponsePayload>({
      reply:
        "Je suis là ! Dis-moi ce que tu veux modifier sur ton budget, tes dépenses ou ton Google Agenda.",
      action: { type: "NONE" },
      provider: "local-smart-engine",
      modelUsed: "vital-local-v3",
    });
  }
}

async function callCloudLLM(
  userMessage: string,
  ctx: AgentContextPayload,
  history: ChatTurn[],
  endpointUrl: string,
  modelName: string,
  apiKey: string | undefined,
  providerLabel: "huggingface-qwen2.5" | "free-cloud-llm-20b"
): Promise<AgentResponsePayload | null> {
  const envelopesSummary = ctx.envelopes
    .map(
      (e) =>
        `- id="${e.id}" (${e.name}): dépensé=${e.spent.toFixed(2)}€ / budget=${e.allocated}€`
    )
    .join("\n");

  const mealsSummary = ctx.batchMeals
    .map(
      (m) =>
        `- id="${m.id}" (${m.title}): ${m.remainingPortions} portions au frigo (${m.costPerPortion.toFixed(2)}€/portion vs ${m.externalMealPrice}€ resto)`
    )
    .join("\n");

  const systemPrompt = `Tu es Vital, un véritable assistant financier et quotidien ultra-intelligent, vif, chaleureux et naturel (comme Siri version Apple Intelligence).
Tu contrôles directement toute l'application VitalBudget de l'utilisateur.
Tu comprends l'humour, le langage familier, les corrections ("en fait j'ai 359€", "change mon budget courses", "annule ça", "mets sur mon Google Agenda"), et tu réponds de manière humaine et fluide en 1 à 3 phrases max.

ÉTAT DU DASHBOARD EN TEMPS RÉEL :
- Reste à vivre disponible : ${ctx.disposableLeft.toFixed(2)} € (soit ${ctx.dailyBudgetAllowed.toFixed(2)} €/jour pour les ${ctx.remainingDays} jours restants)
- Revenu mensuel : ${ctx.monthlyIncome} € | Épargne bloquée : ${ctx.savingsTarget} € | Charges fixes : ${ctx.totalFixed} €
- Dernière opération : ${ctx.lastTransaction ? `"${ctx.lastTransaction.label}" (${ctx.lastTransaction.amount} €)` : "aucune"}
- Enveloppes :
${envelopesSummary}
- Plats Batch Cooking au frigo :
${mealsSummary}

TU DOIS RÉPONDRE UNIQUEMENT EN JSON VALIDE avec exactement cette structure :
{
  "reply": "Ta réponse naturelle, intelligente et personnalisée",
  "action": {
    "type": "NONE" | "SET_DISPOSABLE_LEFT" | "SET_MONTHLY_INCOME" | "ADD_EXPENSE" | "ADD_INCOME" | "UNDO_LAST_TRANSACTION" | "CONSUME_BATCH_MEAL" | "UPDATE_SAVINGS_TARGET" | "UPDATE_ENVELOPE_BUDGET" | "CREATE_CALENDAR_EVENT",
    "targetDisposable": 0,
    "newIncome": 0,
    "amount": 0,
    "label": "",
    "envelopeId": "env-food" | "env-resto" | "env-health" | "env-mobil" | "env-extra",
    "mealId": "",
    "newSavingsTarget": 0,
    "newAllocated": 0,
    "newSpent": -1,
    "calendarTitle": "",
    "calendarHour": 18,
    "calendarDaysOffset": 1
  }
}

COMMENT CHOISIR L'ACTION :
1. Correction du Reste à vivre / solde global (ex: "le dashboard est pas bon j'ai pas 400 mais 359€", "en vrai il me reste 359€", "mets mon solde à 500€") -> type="SET_DISPOSABLE_LEFT", targetDisposable=359.
2. Changement du salaire/revenu mensuel (ex: "mon salaire est de 2800€") -> type="SET_MONTHLY_INCOME", newIncome=2800.
3. Nouvelle dépense (ex: "courses 24€ Lidl", "café 3.50€", "uber 14€") -> type="ADD_EXPENSE", amount=24, label="Courses Lidl", envelopeId="env-food" (ou env-resto, env-health, env-mobil, env-extra).
4. Nouveau revenu/remboursement ponctuel (ex: "on m'a remboursé 40€") -> type="ADD_INCOME", amount=40, label="Remboursement".
5. Annuler la dernière opération (ex: "annule la dernière dépense", "efface ça") -> type="UNDO_LAST_TRANSACTION".
6. Manger une portion du frigo (ex: "j'ai mangé un curry", "enlève une portion") -> type="CONSUME_BATCH_MEAL", mealId=(id du plat).
7. Modifier l'objectif d'épargne (ex: "mets mon épargne à 650€") -> type="UPDATE_SAVINGS_TARGET", newSavingsTarget=650.
8. Modifier une enveloppe (ex: "mets mon budget resto à 200€", "j'ai dépensé 80€ en courses au total") -> type="UPDATE_ENVELOPE_BUDGET", envelopeId=..., newAllocated=200 (ou newSpent=80).
9. Ajouter sur Google Agenda / Calendrier (ex: "mets sur mon Google Agenda courses demain à 14h", "planifie mon batch cooking dimanche à 18h") -> type="CREATE_CALENDAR_EVENT", calendarTitle="...", calendarHour=14, calendarDaysOffset=1.
10. Question ouverte, conseil, discussion -> type="NONE", réponds intelligemment avec les vrais chiffres de l'utilisateur.`;

  const recentHistory = history.slice(-6).map((h) => ({
    role: h.role,
    content: h.content,
  }));

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelName,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          ...recentHistory,
          { role: "user", content: userMessage },
        ],
        max_tokens: 450,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) return null;

    const data = await response.json();
    const rawContent: string = data?.choices?.[0]?.message?.content || "";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const action = normalizeParsedAction(parsed.action, ctx);

    return {
      reply:
        parsed.reply ||
        "C'est fait ! J'ai mis à jour ton dashboard.",
      action,
      provider: providerLabel,
      modelUsed: data?.model || modelName,
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

function normalizeParsedAction(
  rawAction: Record<string, unknown> | undefined,
  ctx: AgentContextPayload
): AgentActionType {
  if (!rawAction || typeof rawAction.type !== "string") {
    return { type: "NONE" };
  }

  const actionType = rawAction.type.toUpperCase();

  if (
    actionType === "SET_DISPOSABLE_LEFT" ||
    actionType.includes("DISPOSABLE")
  ) {
    const target = Number(rawAction.targetDisposable ?? rawAction.amount);
    if (!isNaN(target)) {
      return {
        type: "SET_DISPOSABLE_LEFT",
        targetDisposable: Number(target.toFixed(2)),
        previousDisposable: ctx.disposableLeft,
      };
    }
  }

  if (actionType === "SET_MONTHLY_INCOME") {
    const newInc = Number(rawAction.newIncome ?? rawAction.amount);
    if (!isNaN(newInc) && newInc >= 0) {
      return {
        type: "SET_MONTHLY_INCOME",
        newIncome: Number(newInc.toFixed(2)),
      };
    }
  }

  if (actionType === "UNDO_LAST_TRANSACTION" && ctx.lastTransaction) {
    return {
      type: "UNDO_LAST_TRANSACTION",
      txId: ctx.lastTransaction.id,
      txLabel: ctx.lastTransaction.label,
      txAmount: ctx.lastTransaction.amount,
    };
  }

  if (actionType === "CREATE_CALENDAR_EVENT") {
    const title = String(
      rawAction.calendarTitle ||
        rawAction.label ||
        "Rappel Budget & Batch Cooking"
    );
    const daysOffset =
      rawAction.calendarDaysOffset !== undefined
        ? Number(rawAction.calendarDaysOffset)
        : 1;
    const hour = Number(rawAction.calendarHour) || 18;
    const desc = `Planifié par VitalBudget IA • Reste à vivre actuel : ${ctx.disposableLeft.toFixed(2)} € (${ctx.dailyBudgetAllowed.toFixed(2)} €/jour)`;
    const cal = buildGoogleCalendarUrl(title, desc, daysOffset, hour);
    return {
      type: "CREATE_CALENDAR_EVENT",
      title,
      dateLabel: cal.dateLabel,
      googleCalendarUrl: cal.url,
      description: desc,
    };
  }

  if (actionType === "ADD_EXPENSE") {
    const amount = Number(rawAction.amount);
    if (!isNaN(amount) && amount > 0) {
      const envId = String(rawAction.envelopeId || "env-food");
      const matchedEnv =
        ctx.envelopes.find((e) => e.id === envId) || ctx.envelopes[0];
      return {
        type: "ADD_EXPENSE",
        amount: Number(amount.toFixed(2)),
        label: String(rawAction.label || "Dépense"),
        envelopeId: matchedEnv?.id || "env-food",
        envelopeName: matchedEnv?.name || "Courses & Alimentation",
      };
    }
  }

  if (actionType === "ADD_INCOME") {
    const amount = Number(rawAction.amount);
    if (!isNaN(amount) && amount > 0) {
      return {
        type: "ADD_INCOME",
        amount: Number(amount.toFixed(2)),
        label: String(rawAction.label || "Revenu"),
      };
    }
  }

  if (actionType === "CONSUME_BATCH_MEAL") {
    const targetMeal =
      ctx.batchMeals.find((m) => m.id === rawAction.mealId) ||
      ctx.batchMeals.find((m) => m.remainingPortions > 0);
    if (targetMeal && targetMeal.remainingPortions > 0) {
      const saved = Math.max(
        0,
        Number(
          (targetMeal.externalMealPrice - targetMeal.costPerPortion).toFixed(2)
        )
      );
      return {
        type: "CONSUME_BATCH_MEAL",
        mealId: targetMeal.id,
        mealTitle: targetMeal.title,
        savedAmount: saved,
      };
    }
  }

  if (actionType === "UPDATE_SAVINGS_TARGET") {
    const newTarget = Number(rawAction.newSavingsTarget ?? rawAction.amount);
    if (!isNaN(newTarget) && newTarget >= 0) {
      return {
        type: "UPDATE_SAVINGS_TARGET",
        newSavingsTarget: Number(newTarget.toFixed(2)),
      };
    }
  }

  if (actionType === "UPDATE_ENVELOPE_BUDGET") {
    const alloc = Number(rawAction.newAllocated ?? rawAction.amount);
    const spent =
      rawAction.newSpent !== undefined && Number(rawAction.newSpent) >= 0
        ? Number(rawAction.newSpent)
        : undefined;
    const envId = String(rawAction.envelopeId || "env-food");
    const matchedEnv =
      ctx.envelopes.find((e) => e.id === envId) || ctx.envelopes[0];
    if (matchedEnv) {
      return {
        type: "UPDATE_ENVELOPE_BUDGET",
        envelopeId: matchedEnv.id,
        envelopeName: matchedEnv.name,
        newAllocated: !isNaN(alloc) && alloc > 0 ? Number(alloc.toFixed(2)) : undefined,
        newSpent: spent,
      };
    }
  }

  return { type: "NONE" };
}

/**
 * Offline Fallback when no internet connection is available
 */
function runSmartLocalAgent(
  userMessage: string,
  ctx: AgentContextPayload
): AgentResponsePayload {
  const lower = userMessage.toLowerCase();

  // Direct balance correction
  if (
    /(?:pas\s+\d+\s+mais|corrige|correction|en fait|en vrai|il me reste|reste à vivre|mon solde|pas bon)/i.test(
      lower
    )
  ) {
    const allNumbers = [...userMessage.matchAll(/(\d+(?:[.,]\d{1,2})?)/g)].map(
      (m) => parseFloat(m[1].replace(",", "."))
    );
    if (allNumbers.length > 0) {
      const targetAmount = allNumbers[allNumbers.length - 1];
      const newDaily = (targetAmount / Math.max(1, ctx.remainingDays)).toFixed(2);
      return {
        reply: `C'est corrigé : ton Reste à vivre est ajusté à ${targetAmount.toFixed(2)} € (${newDaily} €/jour).`,
        action: {
          type: "SET_DISPOSABLE_LEFT",
          targetDisposable: Number(targetAmount.toFixed(2)),
          previousDisposable: ctx.disposableLeft,
        },
        provider: "local-smart-engine",
        modelUsed: "vital-local-v3",
      };
    }
  }

  // Google Agenda
  if (/(?:agenda|google|calendrier|calendar|rappelle|planifie)/i.test(lower)) {
    const eventTitle = "Rappel Budget & Batch Cooking";
    const desc = `Planifié par VitalBudget • Reste à vivre : ${ctx.disposableLeft.toFixed(2)} €`;
    const cal = buildGoogleCalendarUrl(eventTitle, desc, 1, 18);
    return {
      reply: `Voici ton événement prêt pour Google Agenda (${cal.dateLabel}) :`,
      action: {
        type: "CREATE_CALENDAR_EVENT",
        title: eventTitle,
        dateLabel: cal.dateLabel,
        googleCalendarUrl: cal.url,
        description: desc,
      },
      provider: "local-smart-engine",
      modelUsed: "vital-local-v3",
    };
  }

  return {
    reply: `Il te reste ${ctx.disposableLeft.toFixed(2)} € (${ctx.dailyBudgetAllowed.toFixed(2)} €/jour). Dis-moi ce que tu souhaites modifier ou ajouter !`,
    action: { type: "NONE" },
    provider: "local-smart-engine",
    modelUsed: "vital-local-v3",
  };
}
