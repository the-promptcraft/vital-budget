import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { NutritionalFamily, VegSubFamily } from "./seedData";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEUR(amount: number, showSign = false): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safeAmount));

  if (showSign && safeAmount > 0) return `+${formatted}`;
  if (safeAmount < 0) return `-${formatted}`;
  return formatted;
}

export function getRemainingDaysInMonth(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.max(1, daysInMonth - today + 1);
}

export function getCurrentFrenchMonthLabel(): string {
  const label = new Date().toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function calculateUnitPrice(price: number, quantity: number): number {
  if (!quantity || quantity <= 0) return 0;
  return Number((price / quantity).toFixed(2));
}

export function calculateInflationPct(
  currentUnitPrice: number,
  referenceUnitPrice: number
): number {
  if (!referenceUnitPrice || referenceUnitPrice <= 0) return 0;
  return Number(
    (
      ((currentUnitPrice - referenceUnitPrice) / referenceUnitPrice) *
      100
    ).toFixed(1)
  );
}

// ============================================================================
// AUTOMATIC USE-BY DATE (DLC) ENGINE (4°C FRIDGE FOOD SAFETY)
// ============================================================================
export interface DlcInfo {
  shelfLifeDays: number;
  dlcDateIso: string;
  dlcFormatted: string;
  daysLeft: number;
  status: "fresh" | "warning" | "expired" | "frozen";
  badgeLabel: string;
  reason: string;
}

export function detectShelfLifeDays(
  title: string,
  ingredientsText = ""
): {
  days: number;
  reason: string;
} {
  const text = `${title} ${ingredientsText}`.toLowerCase();

  // Fish, seafood, minced meat => max 2-3 days in fridge
  if (
    /saumon|salmon|poisson|fish|thon|tuna|sardine|maquereau|mackerel|crevette|shrimp|cabillaud|mer|bolo|haché|boeuf|bœuf|beef|mince|ground/i.test(
      text
    )
  ) {
    return {
      days: 3,
      reason: "Protéine sensible (poisson / viande hachée : max 72h à 4°C)",
    };
  }

  // Poultry (chicken, turkey), cooked eggs => 4 days
  if (
    /poulet|chicken|dinde|turkey|volaille|poultry|oeuf|œuf|egg|frittata|curry/i.test(
      text
    )
  ) {
    return {
      days: 4,
      reason: "Volaille cuite / œufs (jusqu'à 4 jours au frigo à 4°C)",
    };
  }

  // Plant-based, legumes (dahl, chili, lentils, chickpeas, oats) => 5 days
  return {
    days: 5,
    reason: "Végétal / légumineuses / céréales (jusqu'à 5 jours au frigo)",
  };
}

export function computeMealDlc(
  lastCookedAtIso: string,
  title: string,
  ingredientsText = "",
  customShelfLifeDays?: number,
  isFrozen?: boolean
): DlcInfo {
  const detected = detectShelfLifeDays(title, ingredientsText);
  const shelfLifeDays = isFrozen ? 90 : customShelfLifeDays ?? detected.days;

  const cookedDate = new Date(lastCookedAtIso || new Date().toISOString());
  const dlcDate = new Date(cookedDate);
  dlcDate.setDate(dlcDate.getDate() + shelfLifeDays);

  const now = new Date();
  const diffMs = dlcDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const dlcFormatted = dlcDate.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  if (isFrozen) {
    return {
      shelfLifeDays,
      dlcDateIso: dlcDate.toISOString(),
      dlcFormatted,
      daysLeft,
      status: "frozen",
      badgeLabel: `❄️ Congelé (DLC ${dlcFormatted})`,
      reason: "Conservé au congélateur (-18°C)",
    };
  }

  if (daysLeft < 0) {
    return {
      shelfLifeDays,
      dlcDateIso: dlcDate.toISOString(),
      dlcFormatted,
      daysLeft,
      status: "expired",
      badgeLabel: `⚠️ DLC dépassée (${dlcFormatted})`,
      reason: detected.reason,
    };
  }

  if (daysLeft <= 1) {
    return {
      shelfLifeDays,
      dlcDateIso: dlcDate.toISOString(),
      dlcFormatted,
      daysLeft,
      status: "warning",
      badgeLabel:
        daysLeft === 0
          ? `⏳ À manger aujourd'hui (${dlcFormatted})`
          : `⏳ 1 jour restant • DLC ${dlcFormatted}`,
      reason: detected.reason,
    };
  }

  return {
    shelfLifeDays,
    dlcDateIso: dlcDate.toISOString(),
    dlcFormatted,
    daysLeft,
    status: "fresh",
    badgeLabel: `✅ DLC ${dlcFormatted} (${daysLeft}j restants)`,
    reason: detected.reason,
  };
}

// ============================================================================
// BILINGUAL RECEIPT PARSER (FRENCH & ENGLISH SUPERMARKET RECEIPTS)
// ============================================================================
export interface ScannedReceiptItem {
  name: string;
  emoji: string;
  price: number;
  quantity: number;
  unit: "kg" | "L" | "unit";
  family: NutritionalFamily;
  vegSubFamily?: VegSubFamily;
  vitamins: string[];
}

export function classifyReceiptItem(rawName: string): {
  emoji: string;
  family: NutritionalFamily;
  vegSubFamily?: VegSubFamily;
  vitamins: string[];
} {
  const lower = rawName.toLowerCase();

  if (
    /brocoli|broccoli|spinach|epinard|épinard|zucchini|courgette|cabbage|chou|salade|laitue|roquette|haricot vert|poireau|concombre|avocat/i.test(
      lower
    )
  ) {
    return {
      emoji: "🥦",
      family: "Veggies & Vitamins",
      vegSubFamily: "Greens & Cruciferous",
      vitamins: ["Vit C", "Vit K", "Folates (B9)"],
    };
  }
  if (
    /carrot|carotte|tomato|tomate|pepper|poivron|squash|courge|potiron|patate douce|sweet potato|betterave|radis/i.test(
      lower
    )
  ) {
    return {
      emoji: "🥕",
      family: "Veggies & Vitamins",
      vegSubFamily: "Orange & Red Veggies",
      vitamins: ["Vit A", "Vit C", "Potassium"],
    };
  }
  if (/onion|oignon|garlic|ail|echalote|échalote|champignon/i.test(lower)) {
    return {
      emoji: "🧅",
      family: "Veggies & Vitamins",
      vegSubFamily: "Alliums & Roots",
      vitamins: ["Allicine", "Quercétine"],
    };
  }
  if (
    /lentil|lentille|chickpea|pois chiche|bean|haricot|fève|feve|tofu|soja/i.test(
      lower
    )
  ) {
    return {
      emoji: "🫘",
      family: "Veggies & Vitamins",
      vegSubFamily: "Legumes & Pulses",
      vitamins: ["Fer", "Magnésium", "Fibres"],
    };
  }
  if (
    /chicken|poulet|turkey|dinde|volaille|beef|boeuf|bœuf|steak|viande|jambon|lardon|porc|veau|agneau|canard|filet/i.test(
      lower
    )
  ) {
    return {
      emoji: "🍗",
      family: "Whole Proteins",
      vitamins: ["Vit B12", "Fer", "Zinc"],
    };
  }
  if (/egg|oeuf|œuf/i.test(lower)) {
    return {
      emoji: "🥚",
      family: "Whole Proteins",
      vitamins: ["Vit B12", "Choline", "Vit D"],
    };
  }
  if (
    /tuna|thon|sardine|mackerel|maquereau|salmon|saumon|cabillaud|colin|crevette|poisson|truite|merlu/i.test(
      lower
    )
  ) {
    return {
      emoji: "🐟",
      family: "Whole Proteins",
      vitamins: ["Oméga-3", "Vit B12", "Vit D"],
    };
  }
  if (
    /lait|milk|yaourt|yogurt|fromage|cheese|comté|comte|emmental|mozzarella|feta|chèvre|chevre|fromage blanc|skyr|petit suisse|crème|creme/i.test(
      lower
    )
  ) {
    return {
      emoji: "🥛",
      family: "Whole Proteins",
      vitamins: ["Calcium", "Vit B12", "Protéines"],
    };
  }
  if (
    /pasta|pate|pâte|spaghetti|macaroni|penne|tagliatelle|rice|riz|oat|avoine|quinoa|boulgour|semoule|pain|baguette|mie|farine|pomme de terre|patate|gnocchi/i.test(
      lower
    )
  ) {
    return {
      emoji: "🍝",
      family: "Complex Carbs",
      vitamins: ["Magnésium", "Vit B1", "Fibres"],
    };
  }
  if (
    /apple|pomme|kiwi|banana|banane|lemon|citron|orange|clémentine|clementine|mandarine|fraise|framboise|myrtille|poire|pêche|peche|abricot|raisin|mangue|ananas|melon|fruit|compote/i.test(
      lower
    )
  ) {
    return {
      emoji: "🥝",
      family: "Fruits & Antioxidants",
      vitamins: ["Vit C++", "Antioxydants"],
    };
  }
  if (
    /oil|huile|olive|colza|beurre|butter|walnut|noix|chia|almond|amande|noisette|cacahuète|pistache/i.test(
      lower
    )
  ) {
    return {
      emoji: "🫒",
      family: "Healthy Fats",
      vitamins: ["Oméga-3", "Vit E"],
    };
  }
  if (
    /cookie|biscuit|chips|soda|coca|chocolat|ice cream|glace|bonbon|gâteau|gateau|nutella|brioche|croissant|pizza|alcool|bière|biere|vin/i.test(
      lower
    )
  ) {
    return {
      emoji: "🍪",
      family: "Extras / Ultra-Processed",
      vitamins: [],
    };
  }
  return {
    emoji: "🛒",
    family: "Whole Proteins",
    vitamins: ["Nutriments Essentiels"],
  };
}

export function parseReceiptText(rawText: string): ScannedReceiptItem[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3);

  const items: ScannedReceiptItem[] = [];

  const ignoreRegex =
    /\b(?:total|sous-total|subtotal|montant|tva|vat|carte|bancaire|cb|visa|mastercard|sans\s*contact|especes|espèces|rendu|monnaie|merci|thank|ticket|caisse|magasin|siret|tel|tél|date|heure|articles?|solde|remise|fidélité|fidelite|autorisation|paiement|avoir|net\s+a\s+payer|payer)\b/i;

  for (const line of lines) {
    if (ignoreRegex.test(line)) continue;
    // Ignore date or time lines like 25/10/2026 or 14:32
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(line)) continue;
    // Ignore phone or barcode lines with 8+ consecutive digits
    if (/\d{8,}/.test(line)) continue;

    // Match price at end of line, allowing optional € / EUR and trailing French receipt VAT code (A, B, C, *, 1, 2)
    const priceMatch = line.match(
      /(\d{1,3}[.,]\d{2})\s*(?:€|eur|e)?\s*(?:[a-cA-C*1-9])?$/i
    );
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1].replace(",", "."));
    if (isNaN(price) || price <= 0.1 || price > 250) continue;

    const rawLabel = line
      .slice(0, priceMatch.index)
      .replace(/[-.•*_+=:]+$/g, "")
      .replace(/^\d+\s*[xX*]\s*/, "")
      .replace(/\s+/g, " ")
      .trim();

    // Must contain at least 2 letters so we don't parse random numbers
    if (!rawLabel || !/[a-zA-ZÀ-ÿ]{2,}/.test(rawLabel)) continue;

    let quantity = 1.0;
    let unit: "kg" | "L" | "unit" = "kg";

    const gramsMatch = rawLabel.match(/(\d+)\s*g\b/i);
    const kgMatch = rawLabel.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
    const mlMatch = rawLabel.match(/(\d+)\s*(?:ml|cl)\b/i);
    const lMatch = rawLabel.match(/(\d+(?:[.,]\d+)?)\s*l\b/i);
    const packMatch = rawLabel.match(/(?:x|lot\s*de\s*)(\d+)\b/i);

    if (gramsMatch) {
      quantity = Number((parseInt(gramsMatch[1], 10) / 1000).toFixed(3));
      unit = "kg";
    } else if (kgMatch) {
      quantity = parseFloat(kgMatch[1].replace(",", "."));
      unit = "kg";
    } else if (mlMatch) {
      const val = parseInt(mlMatch[1], 10);
      quantity = rawLabel.toLowerCase().includes("cl")
        ? Number((val / 100).toFixed(2))
        : Number((val / 1000).toFixed(3));
      unit = "L";
    } else if (lMatch) {
      quantity = parseFloat(lMatch[1].replace(",", "."));
      unit = "L";
    } else if (packMatch) {
      quantity = parseInt(packMatch[1], 10) || 1;
      unit = "unit";
    }

    const meta = classifyReceiptItem(rawLabel);
    items.push({
      name: rawLabel,
      emoji: meta.emoji,
      price,
      quantity: quantity > 0 ? quantity : 1,
      unit,
      family: meta.family,
      vegSubFamily: meta.vegSubFamily,
      vitamins: meta.vitamins,
    });
  }

  return items;
}

// ============================================================================
// GOOGLE CALENDAR INTEGRATION (DIRECT URL & .ICS FILE)
// ============================================================================
export function buildGoogleCalendarUrl(params: {
  title: string;
  dateYmd: string; // YYYY-MM-DD
  details: string;
}): string {
  const cleanDate = params.dateYmd.replace(/-/g, "");
  const start = `${cleanDate}T200000`;
  const end = `${cleanDate}T204500`;

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", params.title);
  url.searchParams.set("dates", `${start}/${end}`);
  url.searchParams.set("details", params.details);
  return url.toString();
}

export function generateBatchCalendarIcs(
  events: {
    title: string;
    dateYmd: string;
    details: string;
  }[]
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kora//BatchCooking Planner//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((ev, idx) => {
    const cleanDate = ev.dateYmd.replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:kora-${cleanDate}-${idx}@kora.app`,
      `DTSTAMP:${cleanDate}T180000Z`,
      `DTSTART:${cleanDate}T200000`,
      `DTEND:${cleanDate}T204500`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.details.replace(/\n/g, "\\n")}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
