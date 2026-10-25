import { NextRequest, NextResponse } from "next/server";

export type AgentPersona = "finance" | "nutrition";

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
    totalPortions: number;
    costPerPortion: number;
    externalMealPrice: number;
    shelfLifeDays?: number;
    lastCookedAt: string;
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
      type: "ADD_BATCH_MEAL";
      title: string;
      emoji: string;
      portions: number;
      totalCost: number;
      shelfLifeDays: number;
      vitamins: string[];
      containerPlan: string[];
    }
  | {
      type: "GENERATE_WEEKLY_GROCERIES";
      items: {
        name: string;
        emoji: string;
        price: number;
        quantity: number;
        unit: "kg" | "L" | "unit";
        vitamins: string[];
      }[];
      totalEstimated: number;
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
      startIso: string;
      endIso: string;
      googleCalendarUrl: string;
      description: string;
    }
  | {
      type: "NONE";
    };

export interface AgentResponsePayload {
  reply: string;
  action: AgentActionType;
  personaUsed: AgentPersona;
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

/**
 * Automatic DLC (Shelf-life in days) calculator per food type
 */
function inferShelfLifeDays(title: string): number {
  const lower = title.toLowerCase();
  if (/saumon|poisson|thon|crevette|cabillaud|mer/i.test(lower)) return 2;
  if (/poulet|dinde|boeuf|viande|bolognaise|oeuf/i.test(lower)) return 3;
  if (/lentille|pois chiche|tofu|végé|legume|curry|dahl|pâtes|riz|oats/i.test(lower))
    return 4;
  return 3;
}

function buildContainerPlan(title: string, portions: number, shelfDays: number): string[] {
  const plan: string[] = [];
  const days = ["Ce soir", "Demain midi", "Demain soir", "J+2 midi", "J+3 soir", "Congélateur (DLC 30j)"];
  for (let i = 1; i <= portions; i++) {
    const slot = i <= shelfDays ? days[Math.min(i - 1, 4)] : "❄️ À congeler dès aujourd'hui (DLC 30j)";
    plan.push(`Boîte #${i} (${title}) → ${slot} • DLC max ${shelfDays}j`);
  }
  return plan;
}

function parseFrenchCalendarRequest(
  userMessage: string,
  fallbackTitle?: string,
  fallbackHour?: number,
  fallbackDaysOffset?: number
): {
  title: string;
  daysOffset: number;
  hour: number;
  minute: number;
} {
  const lower = userMessage.toLowerCase();

  let hour = fallbackHour ?? 18;
  let minute = 0;
  const timeMatch = lower.match(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?/i);
  if (timeMatch) {
    const parsedH = parseInt(timeMatch[1], 10);
    if (parsedH >= 0 && parsedH <= 23) hour = parsedH;
    if (timeMatch[2]) {
      const parsedM = parseInt(timeMatch[2], 10);
      if (parsedM >= 0 && parsedM <= 59) minute = parsedM;
    }
  } else if (/matin/i.test(lower)) {
    hour = 10;
  } else if (/midi/i.test(lower)) {
    hour = 12;
  } else if (/après-midi|apres-midi/i.test(lower)) {
    hour = 15;
  } else if (/soir/i.test(lower)) {
    hour = 19;
  }

  const now = new Date();
  const currentDayOfWeek = now.getDay();
  let daysOffset = fallbackDaysOffset ?? 1;

  const weekdaysMap: Record<string, number> = {
    dimanche: 0,
    lundi: 1,
    mardi: 2,
    mercredi: 3,
    jeudi: 4,
    vendredi: 5,
    samedi: 6,
  };

  if (/aujourd'hui|ce soir|cet après-midi/i.test(lower)) {
    daysOffset = 0;
  } else if (/après-demain|apres-demain/i.test(lower)) {
    daysOffset = 2;
  } else if (/demain/i.test(lower)) {
    daysOffset = 1;
  } else {
    for (const [dayName, targetDow] of Object.entries(weekdaysMap)) {
      if (lower.includes(dayName)) {
        let diff = (targetDow - currentDayOfWeek + 7) % 7;
        if (diff === 0) diff = 7;
        daysOffset = diff;
        break;
      }
    }
  }

  let title = fallbackTitle?.trim() || "";
  if (!title || title === "Rappel Budget & Batch Cooking") {
    const cleaned = userMessage
      .replace(
        /.*?(?:google\s*agenda|agenda|calendrier|rappelle-moi\s+de|rappelle-moi|planifie|ajoute|mets\s+sur\s+mon|mets)\s*:?\s*/i,
        ""
      )
      .replace(
        /\b(?:aujourd'hui|demain|après-demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|ce\s+soir|à|a)\b/gi,
        " "
      )
      .replace(/\b\d{1,2}\s*(?:h|:)\s*\d{0,2}\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned.length >= 3) {
      title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    } else if (/batch|cuisin|curry|repas/i.test(lower)) {
      title = "Session Batch Cooking Kora";
    } else if (/courses|lidl|carrefour|supermarché/i.test(lower)) {
      title = "Courses Hebdo Kora";
    } else {
      title = "Rappel Kora";
    }
  }

  return { title, daysOffset, hour, minute };
}

function buildCalendarEventAction(
  title: string,
  description: string,
  daysOffset: number = 1,
  hour: number = 18,
  minute: number = 0
): Extract<AgentActionType, { type: "CREATE_CALENDAR_EVENT" }> {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysOffset,
    hour,
    minute,
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
    type: "CREATE_CALENDAR_EVENT",
    title,
    dateLabel,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    googleCalendarUrl: `https://calendar.google.com/calendar/render?${params.toString()}`,
    description,
  };
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_ENABLE_AI_AGENT === "false") {
      return NextResponse.json<AgentResponsePayload>({
        reply:
          "Kill Switch actif (NEXT_PUBLIC_ENABLE_AI_AGENT=false). Aucun appel externe n'a été effectué.",
        action: { type: "NONE" },
        personaUsed: "finance",
        provider: "kill-switch-blocked",
        modelUsed: "none",
      });
    }

    const body = await req.json();
    const userMessage: string = (body.message || "").trim();
    const context: AgentContextPayload = body.context;
    const persona: AgentPersona =
      body.persona === "nutrition" ? "nutrition" : "finance";
    const history: ChatTurn[] = Array.isArray(body.history) ? body.history : [];
    const clientHfToken: string | undefined = body.hfToken;
    const clientKillSwitch: boolean = Boolean(body.killSwitch);

    if (clientKillSwitch) {
      return NextResponse.json<AgentResponsePayload>({
        reply: "Kill Switch activé. Zéro requête réseau envoyée.",
        action: { type: "NONE" },
        personaUsed: persona,
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

    const apiKey =
      clientHfToken?.trim() || process.env.HUGGINGFACE_API_KEY?.trim();

    if (apiKey && apiKey.startsWith("hf_")) {
      const hfResult = await callCloudLLM(
        userMessage,
        context,
        persona,
        history,
        HF_ROUTER_URL,
        DEFAULT_HF_MODEL,
        apiKey,
        "huggingface-qwen2.5"
      );
      if (hfResult) {
        return NextResponse.json<AgentResponsePayload>(
          enforceGuaranteedActions(userMessage, context, hfResult)
        );
      }
    }

    const freeCloudResult = await callCloudLLM(
      userMessage,
      context,
      persona,
      history,
      FREE_KEYLESS_LLM_URL,
      "openai-fast",
      undefined,
      "free-cloud-llm-20b"
    );
    if (freeCloudResult) {
      return NextResponse.json<AgentResponsePayload>(
        enforceGuaranteedActions(userMessage, context, freeCloudResult)
      );
    }

    const localResult = runSmartLocalAgent(userMessage, context, persona);
    return NextResponse.json<AgentResponsePayload>(localResult);
  } catch (err) {
    console.error("[VitalAgent] Error:", err);
    return NextResponse.json<AgentResponsePayload>({
      reply:
        "Je suis prêt ! Dis-moi ce que tu souhaites modifier sur ton budget, tes repas Batch Cooking ou ton Google Agenda.",
      action: { type: "NONE" },
      personaUsed: "finance",
      provider: "local-smart-engine",
      modelUsed: "vital-local-v5",
    });
  }
}

function enforceGuaranteedActions(
  userMessage: string,
  ctx: AgentContextPayload,
  result: AgentResponsePayload
): AgentResponsePayload {
  const lower = userMessage.toLowerCase();

  // 1. Guarantee Calendar Event creation
  if (
    result.action.type !== "CREATE_CALENDAR_EVENT" &&
    /(?:agenda|google|calendrier|calendar|planifie|rappelle-moi)/i.test(lower)
  ) {
    const parsedCal = parseFrenchCalendarRequest(userMessage);
    const desc = `Planifié par Kora IA • Reste à vivre : ${ctx.disposableLeft.toFixed(2)} € (${ctx.dailyBudgetAllowed.toFixed(2)} €/jour)`;
    const calAction = buildCalendarEventAction(
      parsedCal.title,
      desc,
      parsedCal.daysOffset,
      parsedCal.hour,
      parsedCal.minute
    );
    return {
      ...result,
      action: calAction,
    };
  }

  // 2. Guarantee Batch Cooking Container + DLC creation ("j'ai cuisiné 4 boîtes de...", "nouveau batch...")
  if (
    result.action.type === "NONE" &&
    /(?:cuisiné|préparé|prepare|fait un batch|nouveau batch|boîtes de|boites de|portions de)/i.test(
      lower
    ) &&
    !/mangé|mange|pris/i.test(lower)
  ) {
    const portionsMatch = lower.match(/(\d+)\s*(?:portions?|boîtes?|boites?|containers?|plats?)/i);
    const portions = portionsMatch ? Math.min(12, Math.max(2, parseInt(portionsMatch[1], 10))) : 4;
    const costMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*€/);
    const totalCost = costMatch ? parseFloat(costMatch[1].replace(",", ".")) : Number((portions * 2.4).toFixed(2));

    let mealTitle = userMessage
      .replace(/.*?(?:cuisiné|préparé|fait un batch de|nouveau batch de|portions? de|boîtes? de)\s*/i, "")
      .replace(/\b\d+\s*(?:€|euros?|portions?|boîtes?)\b/gi, "")
      .replace(/\b(?:pour|avec|à)\b/gi, "")
      .trim();
    if (!mealTitle || mealTitle.length < 3) mealTitle = "Poulet Curry & Riz Complet";
    mealTitle = mealTitle.charAt(0).toUpperCase() + mealTitle.slice(1);

    const shelfDays = inferShelfLifeDays(mealTitle);
    const containerPlan = buildContainerPlan(mealTitle, portions, shelfDays);

    return {
      ...result,
      personaUsed: "nutrition",
      action: {
        type: "ADD_BATCH_MEAL",
        title: mealTitle,
        emoji: /saumon|poisson|thon/i.test(mealTitle) ? "🐟" : /lentille|dahl|végé/i.test(mealTitle) ? "🥘" : "🍲",
        portions,
        totalCost,
        shelfLifeDays: shelfDays,
        vitamins: ["Vit B12", "Magnésium", "Fer", "Protéines"],
        containerPlan,
      },
    };
  }

  // 3. Guarantee Weekly Grocery Basket recommendation ("courses pour la semaine", "conseilles d'acheter quoi")
  if (
    result.action.type === "NONE" &&
    /(?:courses.*semaine|acheter quoi|quoi acheter|liste de courses|panier hebdo|conseille.*courses)/i.test(
      lower
    )
  ) {
    const curatedItems = [
      { name: "Flocons d'Avoine Complets (1kg)", emoji: "🌾", price: 1.85, quantity: 1, unit: "kg" as const, vitamins: ["Magnésium", "Fer", "Fibres"] },
      { name: "Œufs Plein Air Label Rouge (x12)", emoji: "🥚", price: 3.6, quantity: 12, unit: "unit" as const, vitamins: ["Vit B12", "Vit D", "Choline"] },
      { name: "Filets de Poulet Fermier (1kg)", emoji: "🍗", price: 9.8, quantity: 1, unit: "kg" as const, vitamins: ["Vit B6", "Zinc", "Protéines"] },
      { name: "Lentilles Corail Bio (1kg)", emoji: "🫘", price: 2.9, quantity: 1, unit: "kg" as const, vitamins: ["Fer", "Folates", "Magnésium"] },
      { name: "Brocolis & Épinards Frais (1.5kg)", emoji: "🥦", price: 3.9, quantity: 1.5, unit: "kg" as const, vitamins: ["Vit C", "Vit K", "Calcium"] },
      { name: "Maquereaux / Sardines (x4 boîtes)", emoji: "🐟", price: 5.2, quantity: 4, unit: "unit" as const, vitamins: ["Oméga-3", "Vit D", "Vit B12"] },
    ];
    const totalEstimated = Number(curatedItems.reduce((s, i) => s + i.price, 0).toFixed(2));
    return {
      ...result,
      personaUsed: "nutrition",
      action: {
        type: "GENERATE_WEEKLY_GROCERIES",
        items: curatedItems,
        totalEstimated,
      },
    };
  }

  // 4. Guarantee Reste à vivre correction
  if (
    result.action.type === "NONE" &&
    /(?:pas\s+\d+\s+mais|corrige|correction|en fait|en vrai|il me reste|reste à vivre|mon solde|pas bon)/i.test(
      lower
    )
  ) {
    const allNumbers = [...userMessage.matchAll(/(\d+(?:[.,]\d{1,2})?)/g)].map(
      (m) => parseFloat(m[1].replace(",", "."))
    );
    if (allNumbers.length > 0) {
      const targetAmount = allNumbers[allNumbers.length - 1];
      return {
        ...result,
        action: {
          type: "SET_DISPOSABLE_LEFT",
          targetDisposable: Number(targetAmount.toFixed(2)),
          previousDisposable: ctx.disposableLeft,
        },
      };
    }
  }

  return result;
}

async function callCloudLLM(
  userMessage: string,
  ctx: AgentContextPayload,
  persona: AgentPersona,
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
        `- id="${m.id}" (${m.title}): ${m.remainingPortions}/${m.totalPortions} boîtes au frigo (${m.costPerPortion.toFixed(2)}€/portion, DLC ${m.shelfLifeDays || 3}j)`
    )
    .join("\n");

  const personaIntro =
    persona === "nutrition"
      ? `Tu es "Kora Chef", expert en nutrition, optimisation des courses au kilo, Batch Cooking, gestion des boîtes (containers) et calcul automatique des DLC (dates limites de consommation).`
      : `Tu es "Kora Flow", directeur financier personnel intelligent, expert en gestion de budget, correction de solde en temps réel et synchronisation Google Agenda.`;

  const systemPrompt = `${personaIntro}
Tu pilotes l'application Kora directement pour l'utilisateur. Sois chaleureux, ultra-intelligent, précis et concis (2 à 3 phrases max).

ÉTAT DU DASHBOARD EN TEMPS RÉEL :
- Reste à vivre disponible : ${ctx.disposableLeft.toFixed(2)} € (${ctx.dailyBudgetAllowed.toFixed(2)} €/jour pour ${ctx.remainingDays} jours)
- Revenu mensuel : ${ctx.monthlyIncome} € | Épargne : ${ctx.savingsTarget} € | Charges fixes : ${ctx.totalFixed} €
- Dernière opération : ${ctx.lastTransaction ? `"${ctx.lastTransaction.label}" (${ctx.lastTransaction.amount} €)` : "aucune"}
- Enveloppes :
${envelopesSummary}
- Plats & Containers Batch Cooking au frigo :
${mealsSummary}

RÉPONDS UNIQUEMENT EN JSON VALIDE :
{
  "reply": "Ta réponse experte, humaine et personnalisée",
  "action": {
    "type": "NONE" | "SET_DISPOSABLE_LEFT" | "SET_MONTHLY_INCOME" | "ADD_EXPENSE" | "ADD_INCOME" | "UNDO_LAST_TRANSACTION" | "CONSUME_BATCH_MEAL" | "ADD_BATCH_MEAL" | "GENERATE_WEEKLY_GROCERIES" | "UPDATE_SAVINGS_TARGET" | "UPDATE_ENVELOPE_BUDGET" | "CREATE_CALENDAR_EVENT",
    "targetDisposable": 0,
    "newIncome": 0,
    "amount": 0,
    "label": "",
    "envelopeId": "env-food" | "env-resto" | "env-health" | "env-mobil" | "env-extra",
    "mealId": "",
    "batchTitle": "",
    "batchPortions": 4,
    "batchTotalCost": 10,
    "batchShelfLifeDays": 3,
    "newSavingsTarget": 0,
    "newAllocated": 0,
    "newSpent": -1,
    "calendarTitle": "",
    "calendarHour": 18,
    "calendarDaysOffset": 1
  }
}

RÈGLES D'ACTIONS :
- Si l'utilisateur a cuisiné un plat/batch (ex: "j'ai cuisiné 5 boîtes de poulet curry pour 12€"), utilise type="ADD_BATCH_MEAL", batchTitle="Poulet Curry", batchPortions=5, batchTotalCost=12, batchShelfLifeDays=3 (2j poisson, 3j viande, 4j végé).
- Si l'utilisateur demande quoi acheter pour les courses de la semaine, utilise type="GENERATE_WEEKLY_GROCERIES" et détaille tes conseils nutritionnels dans "reply".
- Si l'utilisateur corrige son solde/reste à vivre (ex: "j'ai pas 400 mais 359€"), utilise type="SET_DISPOSABLE_LEFT", targetDisposable=359.
- Si l'utilisateur demande d'ajouter sur Google Agenda / calendrier, utilise type="CREATE_CALENDAR_EVENT".`;

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
        max_tokens: 500,
        temperature: 0.25,
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
    const action = normalizeParsedAction(parsed.action, userMessage, ctx);

    return {
      reply: parsed.reply || "C'est fait ! Ton espace a été mis à jour.",
      action,
      personaUsed: persona,
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
  userMessage: string,
  ctx: AgentContextPayload
): AgentActionType {
  if (!rawAction || typeof rawAction.type !== "string") {
    return { type: "NONE" };
  }

  const actionType = rawAction.type.toUpperCase();

  if (actionType === "ADD_BATCH_MEAL") {
    const title = String(rawAction.batchTitle || rawAction.label || "Batch Maison").trim();
    const portions = Math.min(12, Math.max(1, Number(rawAction.batchPortions) || 4));
    const totalCost = Math.max(1, Number(rawAction.batchTotalCost || rawAction.amount) || Number((portions * 2.5).toFixed(2)));
    const shelfDays = Number(rawAction.batchShelfLifeDays) || inferShelfLifeDays(title);
    return {
      type: "ADD_BATCH_MEAL",
      title,
      emoji: /saumon|poisson|thon/i.test(title) ? "🐟" : /lentille|dahl|végé/i.test(title) ? "🥘" : "🍲",
      portions,
      totalCost,
      shelfLifeDays: shelfDays,
      vitamins: ["Vit B12", "Magnésium", "Fer", "Protéines"],
      containerPlan: buildContainerPlan(title, portions, shelfDays),
    };
  }

  if (actionType === "GENERATE_WEEKLY_GROCERIES") {
    const curatedItems = [
      { name: "Flocons d'Avoine Complets (1kg)", emoji: "🌾", price: 1.85, quantity: 1, unit: "kg" as const, vitamins: ["Magnésium", "Fer", "Fibres"] },
      { name: "Œufs Plein Air Label Rouge (x12)", emoji: "🥚", price: 3.6, quantity: 12, unit: "unit" as const, vitamins: ["Vit B12", "Vit D", "Choline"] },
      { name: "Filets de Poulet Fermier (1kg)", emoji: "🍗", price: 9.8, quantity: 1, unit: "kg" as const, vitamins: ["Vit B6", "Zinc", "Protéines"] },
      { name: "Lentilles Corail Bio (1kg)", emoji: "🫘", price: 2.9, quantity: 1, unit: "kg" as const, vitamins: ["Fer", "Folates", "Magnésium"] },
      { name: "Brocolis & Épinards Frais (1.5kg)", emoji: "🥦", price: 3.9, quantity: 1.5, unit: "kg" as const, vitamins: ["Vit C", "Vit K", "Calcium"] },
      { name: "Maquereaux / Sardines (x4 boîtes)", emoji: "🐟", price: 5.2, quantity: 4, unit: "unit" as const, vitamins: ["Oméga-3", "Vit D", "Vit B12"] },
    ];
    return {
      type: "GENERATE_WEEKLY_GROCERIES",
      items: curatedItems,
      totalEstimated: 27.25,
    };
  }

  if (
    actionType === "SET_DISPOSABLE_LEFT" ||
    actionType.includes("DISPOSABLE") ||
    actionType.includes("SOLDE")
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

  if (
    (actionType === "UNDO_LAST_TRANSACTION" || actionType.includes("UNDO")) &&
    ctx.lastTransaction
  ) {
    return {
      type: "UNDO_LAST_TRANSACTION",
      txId: ctx.lastTransaction.id,
      txLabel: ctx.lastTransaction.label,
      txAmount: ctx.lastTransaction.amount,
    };
  }

  if (
    actionType === "CREATE_CALENDAR_EVENT" ||
    actionType.includes("CALENDAR") ||
    actionType.includes("AGENDA")
  ) {
    const rawTitle = String(
      rawAction.calendarTitle || rawAction.label || ""
    ).trim();
    const rawHour =
      rawAction.calendarHour !== undefined
        ? Number(rawAction.calendarHour)
        : undefined;
    const rawDays =
      rawAction.calendarDaysOffset !== undefined
        ? Number(rawAction.calendarDaysOffset)
        : undefined;

    const parsedCal = parseFrenchCalendarRequest(
      userMessage,
      rawTitle || undefined,
      rawHour,
      rawDays
    );
    const desc = `Planifié par Kora IA • Reste à vivre actuel : ${ctx.disposableLeft.toFixed(2)} € (${ctx.dailyBudgetAllowed.toFixed(2)} €/jour)`;
    return buildCalendarEventAction(
      parsedCal.title,
      desc,
      parsedCal.daysOffset,
      parsedCal.hour,
      parsedCal.minute
    );
  }

  if (actionType === "ADD_EXPENSE" || actionType.includes("EXPENSE")) {
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

  if (actionType === "CONSUME_BATCH_MEAL" || actionType.includes("MEAL")) {
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
        newAllocated:
          !isNaN(alloc) && alloc > 0 ? Number(alloc.toFixed(2)) : undefined,
        newSpent: spent,
      };
    }
  }

  return { type: "NONE" };
}

function runSmartLocalAgent(
  userMessage: string,
  ctx: AgentContextPayload,
  persona: AgentPersona
): AgentResponsePayload {
  const baseResult: AgentResponsePayload = {
    reply: `Il te reste ${ctx.disposableLeft.toFixed(2)} € (${ctx.dailyBudgetAllowed.toFixed(2)} €/jour). Dis-moi ce que tu souhaites modifier, cuisiner ou planifier !`,
    action: { type: "NONE" },
    personaUsed: persona,
    provider: "local-smart-engine",
    modelUsed: "vital-local-v5",
  };
  return enforceGuaranteedActions(userMessage, ctx, baseResult);
}
