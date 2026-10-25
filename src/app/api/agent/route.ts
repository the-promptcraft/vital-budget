import { NextRequest, NextResponse } from "next/server";

/**
 * ============================================================================
 * 🎓 VITAL AGENT — HUGGING FACE (QWEN 2.5) + MOTEUR LOCAL + GOOGLE AGENDA
 * ============================================================================
 * Comment fonctionne la connexion Hugging Face ?
 * - Le code ci-dessous contient le connecteur officiel vers le routeur gratuit
 *   de Hugging Face (`https://router.huggingface.co/v1/chat/completions`).
 * - Tant que tu n'as pas encore collé ton token gratuit `hf_...` (dans le bouton
 *   "Clé HF" ou sur Vercel), l'application utilise automatiquement le moteur
 *   local `runSmartLocalAgent()` (0€, instantané, sans compte requis).
 * - Dès que tu colles ton token `hf_...`, c'est le modèle `Qwen/Qwen2.5-7B-Instruct`
 *   sur Hugging Face qui prend le relais automatiquement !
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
      newAllocated: number;
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
  provider: "huggingface-qwen2.5" | "local-smart-engine" | "kill-switch-blocked";
  modelUsed: string;
}

const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
const DEFAULT_FREE_MODEL = "Qwen/Qwen2.5-7B-Instruct";

/**
 * Helper to build a 100% free, zero-OAuth Google Calendar event creation URL
 */
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
    // 🛑 LAYER 1 KILL SWITCH: Server Environment Variable Check
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
    const clientHfToken: string | undefined = body.hfToken;
    const clientKillSwitch: boolean = Boolean(body.killSwitch);

    if (clientKillSwitch) {
      return NextResponse.json<AgentResponsePayload>({
        reply:
          "Kill Switch activé. Zéro requête réseau envoyée.",
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

    const apiKey =
      clientHfToken?.trim() || process.env.HUGGINGFACE_API_KEY?.trim();

    if (apiKey && apiKey.startsWith("hf_")) {
      try {
        const hfResult = await callHuggingFaceFreeAgent(
          userMessage,
          context,
          apiKey
        );
        if (hfResult) {
          return NextResponse.json<AgentResponsePayload>(hfResult);
        }
      } catch (hfError) {
        console.warn(
          "[VitalAgent] Hugging Face free endpoint fallback triggered:",
          hfError
        );
      }
    }

    // ⚡ LAYER 3 FALLBACK: Smart Local Agent (100% Free, Instant, Offline-ready)
    const localResult = runSmartLocalAgent(userMessage, context);
    return NextResponse.json<AgentResponsePayload>(localResult);
  } catch (err) {
    console.error("[VitalAgent] Error:", err);
    return NextResponse.json<AgentResponsePayload>({
      reply:
        "Dis-moi simplement une dépense (« Courses 22€ »), une correction (« J'ai 359€ de reste à vivre ») ou un rappel Google Agenda.",
      action: { type: "NONE" },
      provider: "local-smart-engine",
      modelUsed: "vital-local-v2",
    });
  }
}

async function callHuggingFaceFreeAgent(
  userMessage: string,
  ctx: AgentContextPayload,
  apiKey: string
): Promise<AgentResponsePayload | null> {
  const envelopesSummary = ctx.envelopes
    .map(
      (e) =>
        `- ${e.id} (${e.name}): ${e.spent.toFixed(2)}€ dépensés sur ${e.allocated}€`
    )
    .join("\n");

  const mealsSummary = ctx.batchMeals
    .map(
      (m) =>
        `- ${m.id} (${m.title}): ${m.remainingPortions} portions au frigo (${m.costPerPortion.toFixed(2)}€/portion au lieu de ${m.externalMealPrice}€ dehors)`
    )
    .join("\n");

  const systemPrompt = `Tu es l'assistant personnel financier et nutritionnel de VitalBudget.
Tu pilotes toute l'application directement pour l'utilisateur. Sois naturel, élégant, ultra-concis (2 phrases max).

DONNÉES ACTUELLES :
- Reste à vivre : ${ctx.disposableLeft.toFixed(2)}€ (${ctx.dailyBudgetAllowed.toFixed(2)}€/jour pour ${ctx.remainingDays} jours)
- Revenu : ${ctx.monthlyIncome}€ | Épargne : ${ctx.savingsTarget}€
- Dernière transaction : ${ctx.lastTransaction ? `${ctx.lastTransaction.label} (${ctx.lastTransaction.amount}€)` : "aucune"}
- Enveloppes :
${envelopesSummary}
- Plats au frigo :
${mealsSummary}

Réponds UNIQUEMENT avec un objet JSON valide :
{
  "reply": "Ta réponse courte et chaleureuse",
  "action": {
    "type": "NONE" | "ADD_EXPENSE" | "ADD_INCOME" | "SET_DISPOSABLE_LEFT" | "UNDO_LAST_TRANSACTION" | "CONSUME_BATCH_MEAL" | "UPDATE_SAVINGS_TARGET" | "UPDATE_ENVELOPE_BUDGET" | "CREATE_CALENDAR_EVENT",
    "amount": 0,
    "targetDisposable": 0,
    "label": "",
    "envelopeId": "env-food" | "env-resto" | "env-health" | "env-mobil" | "env-extra",
    "mealId": "",
    "newSavingsTarget": 0,
    "newAllocated": 0,
    "calendarTitle": "",
    "calendarHour": 18,
    "calendarDaysOffset": 1
  }
}

Règles d'action :
- Si l'utilisateur corrige son solde/reste à vivre (ex: "le dashboard est pas bon j'ai pas 400 mais 359€", "il me reste 359€"), utilise type="SET_DISPOSABLE_LEFT" et targetDisposable=359.
- Si l'utilisateur veut annuler/supprimer la dernière dépense, utilise type="UNDO_LAST_TRANSACTION".
- Si l'utilisateur demande d'ajouter sur Google Agenda / calendrier, utilise type="CREATE_CALENDAR_EVENT" avec calendarTitle.
- Si l'utilisateur déclare une dépense, utilise type="ADD_EXPENSE", amount, label, envelopeId.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(HF_ROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_FREE_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.2,
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
        "C'est fait ! J'ai mis à jour ton espace.",
      action,
      provider: "huggingface-qwen2.5",
      modelUsed: DEFAULT_FREE_MODEL,
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

  if (rawAction.type === "SET_DISPOSABLE_LEFT") {
    const target = Number(rawAction.targetDisposable ?? rawAction.amount);
    if (!isNaN(target)) {
      return {
        type: "SET_DISPOSABLE_LEFT",
        targetDisposable: Number(target.toFixed(2)),
        previousDisposable: ctx.disposableLeft,
      };
    }
  }

  if (rawAction.type === "UNDO_LAST_TRANSACTION" && ctx.lastTransaction) {
    return {
      type: "UNDO_LAST_TRANSACTION",
      txId: ctx.lastTransaction.id,
      txLabel: ctx.lastTransaction.label,
      txAmount: ctx.lastTransaction.amount,
    };
  }

  if (rawAction.type === "CREATE_CALENDAR_EVENT") {
    const title = String(
      rawAction.calendarTitle || rawAction.label || "Session Batch Cooking & Budget"
    );
    const daysOffset = Number(rawAction.calendarDaysOffset) || 1;
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

  if (rawAction.type === "ADD_EXPENSE") {
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

  if (rawAction.type === "ADD_INCOME") {
    const amount = Number(rawAction.amount);
    if (!isNaN(amount) && amount > 0) {
      return {
        type: "ADD_INCOME",
        amount: Number(amount.toFixed(2)),
        label: String(rawAction.label || "Revenu"),
      };
    }
  }

  if (rawAction.type === "CONSUME_BATCH_MEAL") {
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

  if (rawAction.type === "UPDATE_SAVINGS_TARGET") {
    const newTarget = Number(rawAction.newSavingsTarget || rawAction.amount);
    if (!isNaN(newTarget) && newTarget >= 0) {
      return {
        type: "UPDATE_SAVINGS_TARGET",
        newSavingsTarget: Number(newTarget.toFixed(2)),
      };
    }
  }

  if (rawAction.type === "UPDATE_ENVELOPE_BUDGET") {
    const alloc = Number(rawAction.newAllocated || rawAction.amount);
    const envId = String(rawAction.envelopeId || "env-food");
    const matchedEnv =
      ctx.envelopes.find((e) => e.id === envId) || ctx.envelopes[0];
    if (!isNaN(alloc) && alloc >= 0 && matchedEnv) {
      return {
        type: "UPDATE_ENVELOPE_BUDGET",
        envelopeId: matchedEnv.id,
        envelopeName: matchedEnv.name,
        newAllocated: Number(alloc.toFixed(2)),
      };
    }
  }

  return { type: "NONE" };
}

/**
 * Deterministic Smart Local Agent — Handles corrections, Google Agenda, expenses,
 * batch cooking, and briefings with 0 latency and 0€.
 */
function runSmartLocalAgent(
  userMessage: string,
  ctx: AgentContextPayload
): AgentResponsePayload {
  const lower = userMessage.toLowerCase();

  // 1. DIRECT CORRECTION OF RESTE À VIVRE (e.g. "j'ai pas 400 mais 359 eur", "corrige mon solde à 359€", "il me reste 359€")
  const isCorrectionIntent =
    /(?:pas\s+\d+\s+mais|corrige|correction|en fait|en vrai|il me reste|reste à vivre|mon solde est|pas bon|erreur.*solde|j'ai\s+que)/i.test(
      lower
    );

  if (isCorrectionIntent) {
    // Extract all numbers in the message; if "pas X mais Y", take the LAST number (Y = 359)
    const allNumbers = [...userMessage.matchAll(/(\d+(?:[.,]\d{1,2})?)/g)].map(
      (m) => parseFloat(m[1].replace(",", "."))
    );
    if (allNumbers.length > 0) {
      const targetAmount = allNumbers[allNumbers.length - 1];
      const newDaily = (targetAmount / Math.max(1, ctx.remainingDays)).toFixed(2);
      return {
        reply: `C'est corrigé immédiatement : ton Reste à vivre est maintenant fixé à ${targetAmount.toFixed(2)} € (au lieu de ${ctx.disposableLeft.toFixed(2)} €), soit ${newDaily} €/jour autorisés.`,
        action: {
          type: "SET_DISPOSABLE_LEFT",
          targetDisposable: Number(targetAmount.toFixed(2)),
          previousDisposable: ctx.disposableLeft,
        },
        provider: "local-smart-engine",
        modelUsed: "vital-local-v2",
      };
    }
  }

  // 2. UNDO / DELETE LAST TRANSACTION ("annule la dernière dépense", "supprime la dernière")
  if (
    /(?:annule|supprime|efface|retire).*(?:dernière|derniere|précédente|dépense|transaction|entrée)/i.test(
      lower
    ) &&
    ctx.lastTransaction
  ) {
    return {
      reply: `J'ai annulé la dernière opération (« ${ctx.lastTransaction.label} » de ${ctx.lastTransaction.amount.toFixed(2)} €) et rétabli ton solde automatiquement.`,
      action: {
        type: "UNDO_LAST_TRANSACTION",
        txId: ctx.lastTransaction.id,
        txLabel: ctx.lastTransaction.label,
        txAmount: ctx.lastTransaction.amount,
      },
      provider: "local-smart-engine",
      modelUsed: "vital-local-v2",
    };
  }

  // 3. GOOGLE AGENDA / CALENDAR EVENT ("mets sur mon google agenda...", "agenda", "calendrier", "rappelle-moi")
  if (/(?:agenda|google|calendrier|calendar|rappelle|planifie)/i.test(lower)) {
    let eventTitle = "Rappel Budget & Batch Cooking";
    if (/batch|cuisin|repas|curry|pâtes|oats/i.test(lower)) {
      eventTitle = "🍲 Session Batch Cooking VitalBudget";
    } else if (/courses|supermarché|lidl|carrefour|marché/i.test(lower)) {
      eventTitle = "🛒 Courses Économiques VitalBudget";
    } else if (/loyer|facture|épargne|virement/i.test(lower)) {
      eventTitle = "💳 Vérification Budget & Charges Fixes";
    } else {
      const cleaned = userMessage
        .replace(
          /.*(?:agenda|calendrier|planifie|rappelle-moi de|rappelle moi)\s*:?\s*/i,
          ""
        )
        .trim();
      if (cleaned.length > 2) {
        eventTitle = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    }

    const hourMatch = lower.match(/(\d{1,2})\s*h/);
    const hour = hourMatch ? Math.min(23, Math.max(6, parseInt(hourMatch[1], 10))) : 18;
    const daysOffset = /aujourd'hui|ce soir/i.test(lower)
      ? 0
      : /dimanche|week-end|weekend/i.test(lower)
      ? 2
      : 1;

    const desc = `Planifié par ton assistant VitalBudget • Reste à vivre : ${ctx.disposableLeft.toFixed(2)} € (${ctx.dailyBudgetAllowed.toFixed(2)} €/jour).`;
    const cal = buildGoogleCalendarUrl(eventTitle, desc, daysOffset, hour);

    return {
      reply: `Ton événement « ${eventTitle} » est prêt pour ${cal.dateLabel}. Clique sur le bouton ci-dessous pour l'ajouter en 1 clic à ton Google Agenda :`,
      action: {
        type: "CREATE_CALENDAR_EVENT",
        title: eventTitle,
        dateLabel: cal.dateLabel,
        googleCalendarUrl: cal.url,
        description: desc,
      },
      provider: "local-smart-engine",
      modelUsed: "vital-local-v2",
    };
  }

  // 4. CONSUME A FRIDGE BATCH MEAL PORTION
  if (
    /(mangé|mange|portion|batch|frigo|eat|ate|consumed|plat)/i.test(lower) &&
    !/idée|que manger|quoi manger|suggest/i.test(lower)
  ) {
    const availableMeals = ctx.batchMeals.filter(
      (m) => m.remainingPortions > 0
    );
    const matchedMeal =
      availableMeals.find((m) =>
        lower.includes(m.title.toLowerCase().split(" ")[0])
      ) || availableMeals[0];

    if (matchedMeal) {
      const saved = Number(
        (matchedMeal.externalMealPrice - matchedMeal.costPerPortion).toFixed(2)
      );
      const leftAfter = matchedMeal.remainingPortions - 1;
      return {
        reply: `1 portion de « ${matchedMeal.title} » déduite du frigo (${leftAfter} restante${leftAfter > 1 ? "s" : ""}). Tu viens d'économiser ${saved.toFixed(2)} € par rapport à un repas à l'extérieur.`,
        action: {
          type: "CONSUME_BATCH_MEAL",
          mealId: matchedMeal.id,
          mealTitle: matchedMeal.title,
          savedAmount: saved,
        },
        provider: "local-smart-engine",
        modelUsed: "vital-local-v2",
      };
    }
  }

  // 5. MEAL SUGGESTION ("Que manger ce soir ?")
  if (/que manger|quoi manger|idée repas|cuisiner|ce soir|dinner|tonight/i.test(lower)) {
    const readyMeals = ctx.batchMeals.filter((m) => m.remainingPortions > 0);
    if (readyMeals.length > 0) {
      const best = readyMeals[0];
      const saved = (best.externalMealPrice - best.costPerPortion).toFixed(2);
      return {
        reply: `Tu as ${best.remainingPortions} portions de « ${best.title} » prêtes au frigo (${best.costPerPortion.toFixed(2)} €/portion). En prenant ça ce soir, tu préserves ${saved} € sur ton budget.`,
        action: { type: "NONE" },
        provider: "local-smart-engine",
        modelUsed: "vital-local-v2",
      };
    }
    return {
      reply: `Ton frigo est vide ce soir. Lance une préparation de 4 portions pour maintenir ton rythme de ${ctx.dailyBudgetAllowed.toFixed(2)} €/jour.`,
      action: { type: "NONE" },
      provider: "local-smart-engine",
      modelUsed: "vital-local-v2",
    };
  }

  // 6. DAILY BRIEFING ("Bilan du jour")
  if (/bilan|analyse|status|état|comment ça va|budget du jour|briefing/i.test(lower)) {
    const overEnv = ctx.envelopes.find((e) => e.spent > e.allocated * 0.8);
    const statusLine =
      ctx.disposableLeft > 0
        ? `Il te reste ${ctx.disposableLeft.toFixed(2)} € disponibles, soit ${ctx.dailyBudgetAllowed.toFixed(2)} €/jour pour les ${ctx.remainingDays} prochains jours.`
        : `Ton solde disponible est dépassé de ${Math.abs(ctx.disposableLeft).toFixed(2)} €.`;

    const adviceLine = overEnv
      ? ` Attention à la catégorie « ${overEnv.name} » (${overEnv.spent.toFixed(0)}€ / ${overEnv.allocated}€).`
      : ` Tes dépenses sont parfaitement maîtrisées ce mois-ci.`;

    return {
      reply: statusLine + adviceLine,
      action: { type: "NONE" },
      provider: "local-smart-engine",
      modelUsed: "vital-local-v2",
    };
  }

  // 7. UPDATE SAVINGS TARGET
  const savingsMatch = lower.match(
    /(?:épargne|epargne|savings)\s*(?:à|a|de|to)?\s*(\d+(?:[.,]\d+)?)/i
  );
  if (savingsMatch) {
    const newTarget = parseFloat(savingsMatch[1].replace(",", "."));
    if (!isNaN(newTarget) && newTarget >= 0) {
      return {
        reply: `Objectif d'épargne ajusté à ${newTarget.toFixed(2)} €. Ton Reste à vivre a été mis à jour instantanément.`,
        action: {
          type: "UPDATE_SAVINGS_TARGET",
          newSavingsTarget: newTarget,
        },
        provider: "local-smart-engine",
        modelUsed: "vital-local-v2",
      };
    }
  }

  // 8. EXPENSE OR INCOME WITH AMOUNT
  const amountMatch = userMessage.match(/(\d+(?:[.,]\d{1,2})?)\s*€?/);
  if (amountMatch) {
    const amount = parseFloat(amountMatch[1].replace(",", "."));
    if (!isNaN(amount) && amount > 0) {
      if (/salaire|revenu|remboursement|prime|virement reçu|income/i.test(lower)) {
        const cleanLabel =
          userMessage
            .replace(amountMatch[0], "")
            .replace(/^[-\s,.:€]+|[-\s,.:€]+$/g, "")
            .trim() || "Revenu";
        return {
          reply: `+${amount.toFixed(2)} € ajoutés (${cleanLabel}). Ton Reste à vivre augmente immédiatement.`,
          action: {
            type: "ADD_INCOME",
            amount,
            label: cleanLabel,
          },
          provider: "local-smart-engine",
          modelUsed: "vital-local-v2",
        };
      }

      let envId = "env-food";
      if (
        /resto|restaurant|bar|café|cafe|coffee|boulangerie|pizza|sushi|burger|uber eats|deliveroo|déjeuner|dîner|lunch/i.test(
          lower
        )
      ) {
        envId = "env-resto";
      } else if (
        /sport|gym|santé|sante|pharmacie|médecin|medecin|vitamine|complément|health/i.test(
          lower
        )
      ) {
        envId = "env-health";
      } else if (
        /train|métro|metro|bus|uber|taxi|essence|carburant|navigo|péage|velo|transport/i.test(
          lower
        )
      ) {
        envId = "env-mobil";
      } else if (
        /shopping|vêtement|vetement|tech|amazon|fnac|cinéma|cinema|cadeau|jeu|extra|sortie/i.test(
          lower
        )
      ) {
        envId = "env-extra";
      }

      const matchedEnv =
        ctx.envelopes.find((e) => e.id === envId) || ctx.envelopes[0];

      const cleanLabel =
        userMessage
          .replace(amountMatch[0], "")
          .replace(
            /\b(j'ai|payé|acheté|dépensé|pour|chez|à|au|de|en|euros?|€)\b/gi,
            " "
          )
          .replace(/\s+/g, " ")
          .trim() || matchedEnv.name;

      const formattedLabel =
        cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
      const newRemaining = (ctx.disposableLeft - amount).toFixed(2);

      return {
        reply: `${amount.toFixed(2)} € notés dans « ${matchedEnv.name} » (${formattedLabel}). Il te reste ${newRemaining} € disponibles.`,
        action: {
          type: "ADD_EXPENSE",
          amount,
          label: formattedLabel,
          envelopeId: matchedEnv.id,
          envelopeName: matchedEnv.name,
        },
        provider: "local-smart-engine",
        modelUsed: "vital-local-v2",
      };
    }
  }

  return {
    reply: `Tu disposes de ${ctx.disposableLeft.toFixed(2)} € (${ctx.dailyBudgetAllowed.toFixed(2)} €/jour). Écris par exemple : « Courses 22€ », « J'ai pas ${Math.round(ctx.disposableLeft)} mais 359€ », ou « Mets sur mon Google Agenda Batch Cooking demain 18h ».`,
    action: { type: "NONE" },
    provider: "local-smart-engine",
    modelUsed: "vital-local-v2",
  };
}
