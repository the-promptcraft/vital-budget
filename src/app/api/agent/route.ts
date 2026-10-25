import { NextRequest, NextResponse } from "next/server";

/**
 * ============================================================================
 * 🎓 HOW THIS HUGGING FACE AGENT WORKS (NEXT.JS + VERCEL SERVERLESS)
 * ============================================================================
 * 1. KILL SWITCH CHECK: If NEXT_PUBLIC_ENABLE_AI_AGENT === "false", it stops
 *    immediately. Zero external network calls are ever made.
 * 2. FREE HUGGING FACE ROUTER: Uses https://router.huggingface.co/v1/chat/completions
 *    with the free open-weight model `Qwen/Qwen2.5-7B-Instruct`.
 *    - Requires NO credit card on Hugging Face.
 *    - Only uses a free User Access Token (hf_...).
 * 3. TOOL CALLING (DIRECT APP MANAGEMENT): The agent replies with structured JSON
 *    containing both a friendly message (`reply`) and an optional `action` object
 *    that your Zustand store executes automatically (add expense, eat batch meal,
 *    adjust budget, etc.).
 * 4. AUTOMATIC LOCAL FALLBACK: If you haven't added your HF token yet, or if
 *    Hugging Face's free tier is busy, `runSmartLocalAgent()` executes the exact
 *    same logic locally in pure TypeScript for 0.00€ and 0 crashes.
 * ============================================================================
 */

export interface AgentContextPayload {
  disposableLeft: number;
  dailyBudgetAllowed: number;
  remainingDays: number;
  monthlyIncome: number;
  savingsTarget: number;
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

export async function POST(req: NextRequest) {
  try {
    // 🛑 LAYER 1 KILL SWITCH: Server Environment Variable Check
    if (process.env.NEXT_PUBLIC_ENABLE_AI_AGENT === "false") {
      return NextResponse.json<AgentResponsePayload>({
        reply:
          "🛑 Kill Switch actif (NEXT_PUBLIC_ENABLE_AI_AGENT=false). Aucun appel externe n'a été effectué.",
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
          "🛑 Kill Switch activé dans l'application. Zéro requête réseau envoyée.",
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

    // First, check if the user command is a direct action we can parse deterministically
    // or pass to Hugging Face Qwen 2.5
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
        "Je suis prêt à t'aider. Essaie par exemple : « Courses 22€ Lidl » ou « Bilan du jour ».",
      action: { type: "NONE" },
      provider: "local-smart-engine",
      modelUsed: "vital-local-v1",
    });
  }
}

/**
 * Calls Hugging Face's Free Serverless Router with Qwen/Qwen2.5-7B-Instruct
 */
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

  const systemPrompt = `Tu es VitalAgent, l'assistant financier et nutritionnel intelligent de l'application VitalBudget (style Apple).
Tu gères directement l'application pour l'utilisateur. Sois chaleureux, ultra-concis (2 phrases maximum) et précis avec les chiffres.

DONNÉES ACTUELLES DE L'UTILISATEUR :
- Reste à vivre réel : ${ctx.disposableLeft.toFixed(2)}€ (${ctx.dailyBudgetAllowed.toFixed(2)}€/jour autorisés pour les ${ctx.remainingDays} jours restants)
- Revenu mensuel : ${ctx.monthlyIncome}€ | Objectif épargne : ${ctx.savingsTarget}€
- Enveloppes budgétaires :
${envelopesSummary}
- Plats Batch Cooking au frigo :
${mealsSummary}

RÈGLE DE RÉPONSE OBLIGATOIRE :
Réponds UNIQUEMENT avec un objet JSON valide (sans markdown autour) au format suivant :
{
  "reply": "Ta réponse courte en français (ou dans la langue de l'utilisateur)",
  "action": {
    "type": "NONE" | "ADD_EXPENSE" | "ADD_INCOME" | "CONSUME_BATCH_MEAL" | "UPDATE_SAVINGS_TARGET",
    "amount": 0,
    "label": "",
    "envelopeId": "env-food" | "env-resto" | "env-health" | "env-mobil" | "env-extra",
    "mealId": "",
    "newSavingsTarget": 0
  }
}

Choisis l'action selon la demande :
- Si l'utilisateur déclare une dépense (ex: "Courses 25€ Lidl", "Café 3€", "Uber 15€"), utilise type="ADD_EXPENSE", remplis amount, label, et le bon envelopeId (env-food pour courses/supermarché, env-resto pour restaurant/bar/café/boulangerie, env-health pour santé/sport/pharmacie, env-mobil pour transport/essence/train/uber, env-extra pour shopping/loisirs/tech).
- Si l'utilisateur dit avoir mangé une portion d'un plat préparé, utilise type="CONSUME_BATCH_MEAL" et indique mealId.
- Si l'utilisateur demande un bilan, un conseil ou une idée repas, utilise type="NONE" et donne un conseil chiffré pertinent.`;

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
        max_tokens: 280,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const rawContent: string = data?.choices?.[0]?.message?.content || "";
    if (!rawContent) return null;

    // Extract JSON block if wrapped in ```json ... ```
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const action = normalizeParsedAction(parsed.action, ctx);

    return {
      reply:
        parsed.reply ||
        "C'est noté ! J'ai mis à jour ton tableau de bord VitalBudget.",
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

  if (rawAction.type === "ADD_EXPENSE") {
    const amount = Number(rawAction.amount);
    if (!isNaN(amount) && amount > 0) {
      const envId = String(rawAction.envelopeId || "env-food");
      const matchedEnv =
        ctx.envelopes.find((e) => e.id === envId) || ctx.envelopes[0];
      return {
        type: "ADD_EXPENSE",
        amount: Number(amount.toFixed(2)),
        label: String(rawAction.label || "Dépense rapide"),
        envelopeId: matchedEnv?.id || "env-food",
        envelopeName: matchedEnv?.name || "Groceries & Whole Foods",
      };
    }
  }

  if (rawAction.type === "ADD_INCOME") {
    const amount = Number(rawAction.amount);
    if (!isNaN(amount) && amount > 0) {
      return {
        type: "ADD_INCOME",
        amount: Number(amount.toFixed(2)),
        label: String(rawAction.label || "Revenu / Remboursement"),
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

  return { type: "NONE" };
}

/**
 * Deterministic Smart Local Agent — Works with 0 latency and 0 API cost,
 * parsing natural language commands in French & English and managing the app directly.
 */
function runSmartLocalAgent(
  userMessage: string,
  ctx: AgentContextPayload
): AgentResponsePayload {
  const lower = userMessage.toLowerCase();

  // 1. Check if user wants to consume a batch meal portion
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
        reply: `🍲 1 portion de « ${matchedMeal.title} » déduite du frigo (il en reste ${leftAfter}). Tu viens d'économiser ${saved.toFixed(2)} € par rapport à un repas acheté dehors !`,
        action: {
          type: "CONSUME_BATCH_MEAL",
          mealId: matchedMeal.id,
          mealTitle: matchedMeal.title,
          savedAmount: saved,
        },
        provider: "local-smart-engine",
        modelUsed: "vital-local-v1",
      };
    }
  }

  // 2. Check if user is asking "What to eat tonight?" / Meal suggestion
  if (/que manger|quoi manger|idée repas|cuisiner|ce soir|dinner|tonight/i.test(lower)) {
    const readyMeals = ctx.batchMeals.filter((m) => m.remainingPortions > 0);
    if (readyMeals.length > 0) {
      const best = readyMeals[0];
      const saved = (best.externalMealPrice - best.costPerPortion).toFixed(2);
      return {
        reply: `🥗 Tu as encore ${best.remainingPortions} portions de « ${best.title} » prêtes au frigo (${best.costPerPortion.toFixed(2)} €/portion). En mangeant ça ce soir au lieu de commander, tu économises ${saved} € !`,
        action: { type: "NONE" },
        provider: "local-smart-engine",
        modelUsed: "vital-local-v1",
      };
    }
    return {
      reply: `🍲 Ton frigo Batch Cooking est vide ! Prépare une session de 4 portions ce soir (env. 2,50 €/portion) pour protéger tes ${ctx.dailyBudgetAllowed.toFixed(2)} €/jour.`,
      action: { type: "NONE" },
      provider: "local-smart-engine",
      modelUsed: "vital-local-v1",
    };
  }

  // 3. Check if user wants a Daily Briefing / Bilan
  if (/bilan|analyse|status|état|comment ça va|budget du jour|briefing/i.test(lower)) {
    const overEnv = ctx.envelopes.find((e) => e.spent > e.allocated * 0.8);
    const statusLine =
      ctx.disposableLeft > 0
        ? `✅ Il te reste ${ctx.disposableLeft.toFixed(2)} € de Reste à Vivre, soit ${ctx.dailyBudgetAllowed.toFixed(2)} €/jour pour les ${ctx.remainingDays} prochains jours.`
        : `⚠️ Attention : ton Reste à Vivre est dépassé de ${Math.abs(ctx.disposableLeft).toFixed(2)} €.`;

    const adviceLine = overEnv
      ? ` Surveille l'enveloppe « ${overEnv.name} » (${overEnv.spent.toFixed(0)}€ / ${overEnv.allocated}€).`
      : ` Toutes tes enveloppes sont bien équilibrées, continue comme ça !`;

    return {
      reply: statusLine + adviceLine,
      action: { type: "NONE" },
      provider: "local-smart-engine",
      modelUsed: "vital-local-v1",
    };
  }

  // 4. Check if user wants to update savings target
  const savingsMatch = lower.match(
    /(?:épargne|epargne|savings)\s*(?:à|a|de|to)?\s*(\d+(?:[.,]\d+)?)/i
  );
  if (savingsMatch) {
    const newTarget = parseFloat(savingsMatch[1].replace(",", "."));
    if (!isNaN(newTarget) && newTarget >= 0) {
      return {
        reply: `🎯 Objectif d'épargne mensuel mis à jour à ${newTarget.toFixed(2)} €. Ton Reste à Vivre a été recalculé automatiquement !`,
        action: {
          type: "UPDATE_SAVINGS_TARGET",
          newSavingsTarget: newTarget,
        },
        provider: "local-smart-engine",
        modelUsed: "vital-local-v1",
      };
    }
  }

  // 5. Check if user is logging an expense or income with a number (e.g. "Courses 25€ Lidl", "Café 3.50€", "18€ resto")
  const amountMatch = userMessage.match(/(\d+(?:[.,]\d{1,2})?)\s*€?/);
  if (amountMatch) {
    const amount = parseFloat(amountMatch[1].replace(",", "."));
    if (!isNaN(amount) && amount > 0) {
      // Check if it's income
      if (/salaire|revenu|remboursement|prime|virement reçu|income/i.test(lower)) {
        const cleanLabel =
          userMessage
            .replace(amountMatch[0], "")
            .replace(/^[-\s,.:€]+|[-\s,.:€]+$/g, "")
            .trim() || "Revenu ajouté";
        return {
          reply: `💰 +${amount.toFixed(2)} € ajoutés en revenu (« ${cleanLabel} »). Ton Reste à Vivre monte immédiatement !`,
          action: {
            type: "ADD_INCOME",
            amount,
            label: cleanLabel,
          },
          provider: "local-smart-engine",
          modelUsed: "vital-local-v1",
        };
      }

      // Otherwise classify expense envelope
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
          .replace(/\b(j'ai|payé|acheté|dépensé|pour|chez|à|au|de|en|euros?|€)\b/gi, " ")
          .replace(/\s+/g, " ")
          .trim() || matchedEnv.name;

      const formattedLabel =
        cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
      const newRemaining = (ctx.disposableLeft - amount).toFixed(2);

      return {
        reply: `✨ ${amount.toFixed(2)} € enregistrés dans « ${matchedEnv.name} » (${formattedLabel}). Il te reste ${newRemaining} € de Reste à Vivre.`,
        action: {
          type: "ADD_EXPENSE",
          amount,
          label: formattedLabel,
          envelopeId: matchedEnv.id,
          envelopeName: matchedEnv.name,
        },
        provider: "local-smart-engine",
        modelUsed: "vital-local-v1",
      };
    }
  }

  // Default helpful response
  return {
    reply: `👋 Tu as ${ctx.disposableLeft.toFixed(2)} € de Reste à Vivre (${ctx.dailyBudgetAllowed.toFixed(2)} €/jour). Dis-moi simplement une dépense comme « Courses 22€ Lidl », « Café 3€ » ou clique sur un bouton rapide !`,
    action: { type: "NONE" },
    provider: "local-smart-engine",
    modelUsed: "vital-local-v1",
  };
}
