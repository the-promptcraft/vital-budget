import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { NutritionalFamily, VegSubFamily } from "./seedData";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEUR(amount: number, showSign = false): string {
  const formatted = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  if (showSign && amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
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
    (((currentUnitPrice - referenceUnitPrice) / referenceUnitPrice) * 100).toFixed(1)
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

export function detectShelfLifeDays(title: string, ingredientsText = ""): {
  days: number;
  reason: string;
} {
  const text = `${title} ${ingredientsText}`.toLowerCase();

  // Minced meat, Bolognese, fish, seafood => max 3 days in fridge
  if (
    text.includes("bolo") ||
    text.includes("beef") ||
    text.includes("mince") ||
    text.includes("ground") ||
    text.includes("haché") ||
    text.includes("boeuf") ||
    text.includes("bœuf") ||
    text.includes("tuna") ||
    text.includes("thon") ||
    text.includes("sardine") ||
    text.includes("mackerel") ||
    text.includes("maquereau") ||
    text.includes("salmon") ||
    text.includes("saumon") ||
    text.includes("fish") ||
    text.includes("poisson") ||
    text.includes("shrimp")
  ) {
    return {
      days: 3,
      reason: "Sensitive protein (ground beef / cooked fish: max 72h at 4°C)",
    };
  }

  // Poultry (chicken, turkey), cooked eggs => 4 days
  if (
    text.includes("chicken") ||
    text.includes("poulet") ||
    text.includes("turkey") ||
    text.includes("dinde") ||
    text.includes("poultry") ||
    text.includes("egg") ||
    text.includes("œuf") ||
    text.includes("oeuf") ||
    text.includes("frittata") ||
    text.includes("curry")
  ) {
    return {
      days: 4,
      reason: "Cooked poultry / eggs (up to 4 days in the fridge at 4°C)",
    };
  }

  // Plant-based, legumes (dahl, chili, lentils, chickpeas, oats) => 5 days
  return {
    days: 5,
    reason: "Plant-based / legumes / grains (up to 5 days in the fridge)",
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
  const shelfLifeDays = isFrozen
    ? 90
    : customShelfLifeDays ?? detected.days;

  const cookedDate = new Date(lastCookedAtIso || new Date().toISOString());
  const dlcDate = new Date(cookedDate);
  dlcDate.setDate(dlcDate.getDate() + shelfLifeDays);

  const now = new Date();
  const diffMs = dlcDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const dlcFormatted = dlcDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (isFrozen) {
    return {
      shelfLifeDays,
      dlcDateIso: dlcDate.toISOString(),
      dlcFormatted,
      daysLeft,
      status: "frozen",
      badgeLabel: `❄️ Frozen (Use by ${dlcFormatted})`,
      reason: "Stored in freezer (-18°C)",
    };
  }

  if (daysLeft < 0) {
    return {
      shelfLifeDays,
      dlcDateIso: dlcDate.toISOString(),
      dlcFormatted,
      daysLeft,
      status: "expired",
      badgeLabel: `⚠️ Expired (${dlcFormatted})`,
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
          ? `⏳ Eat Today (${dlcFormatted})`
          : `⏳ 1 Day Left • Eat by ${dlcFormatted}`,
      reason: detected.reason,
    };
  }

  return {
    shelfLifeDays,
    dlcDateIso: dlcDate.toISOString(),
    dlcFormatted,
    daysLeft,
    status: "fresh",
    badgeLabel: `✅ Use by ${dlcFormatted} (${daysLeft}d left)`,
    reason: detected.reason,
  };
}

// ============================================================================
// BILINGUAL RECEIPT PARSER (ENGLISH & FRENCH RECEIPTS -> ENGLISH CATEGORIES)
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
    lower.includes("brocoli") ||
    lower.includes("broccoli") ||
    lower.includes("spinach") ||
    lower.includes("epinard") ||
    lower.includes("épinard") ||
    lower.includes("zucchini") ||
    lower.includes("courgette") ||
    lower.includes("cabbage") ||
    lower.includes("chou")
  ) {
    return {
      emoji: "🥦",
      family: "Veggies & Vitamins",
      vegSubFamily: "Greens & Cruciferous",
      vitamins: ["Vit C", "Vit K", "Folate (B9)"],
    };
  }
  if (
    lower.includes("carrot") ||
    lower.includes("carotte") ||
    lower.includes("tomato") ||
    lower.includes("tomate") ||
    lower.includes("pepper") ||
    lower.includes("poivron") ||
    lower.includes("squash") ||
    lower.includes("courge") ||
    lower.includes("sweet potato") ||
    lower.includes("patate douce")
  ) {
    return {
      emoji: "🥕",
      family: "Veggies & Vitamins",
      vegSubFamily: "Orange & Red Veggies",
      vitamins: ["Vit A", "Vit C", "Potassium"],
    };
  }
  if (
    lower.includes("onion") ||
    lower.includes("oignon") ||
    lower.includes("garlic") ||
    lower.includes("ail") ||
    lower.includes("leek") ||
    lower.includes("poireau")
  ) {
    return {
      emoji: "🧅",
      family: "Veggies & Vitamins",
      vegSubFamily: "Alliums & Roots",
      vitamins: ["Allicin", "Quercetin"],
    };
  }
  if (
    lower.includes("lentil") ||
    lower.includes("lentille") ||
    lower.includes("chickpea") ||
    lower.includes("pois chiche") ||
    lower.includes("bean") ||
    lower.includes("haricot")
  ) {
    return {
      emoji: "🫘",
      family: "Veggies & Vitamins",
      vegSubFamily: "Legumes & Pulses",
      vitamins: ["Iron", "Magnesium", "Fiber"],
    };
  }
  if (
    lower.includes("chicken") ||
    lower.includes("poulet") ||
    lower.includes("turkey") ||
    lower.includes("dinde") ||
    lower.includes("beef") ||
    lower.includes("boeuf") ||
    lower.includes("bœuf") ||
    lower.includes("steak") ||
    lower.includes("viande")
  ) {
    return {
      emoji: "🍗",
      family: "Whole Proteins",
      vitamins: ["Vit B12", "Iron", "Zinc"],
    };
  }
  if (lower.includes("egg") || lower.includes("oeuf") || lower.includes("œuf")) {
    return {
      emoji: "🥚",
      family: "Whole Proteins",
      vitamins: ["Vit B12", "Choline", "Vit D"],
    };
  }
  if (
    lower.includes("tuna") ||
    lower.includes("thon") ||
    lower.includes("sardine") ||
    lower.includes("mackerel") ||
    lower.includes("maquereau") ||
    lower.includes("salmon") ||
    lower.includes("saumon")
  ) {
    return {
      emoji: "🐟",
      family: "Whole Proteins",
      vitamins: ["Omega-3", "Vit B12", "Vit D"],
    };
  }
  if (
    lower.includes("pasta") ||
    lower.includes("pate") ||
    lower.includes("pâte") ||
    lower.includes("spaghetti") ||
    lower.includes("rice") ||
    lower.includes("riz") ||
    lower.includes("oat") ||
    lower.includes("avoine") ||
    lower.includes("quinoa")
  ) {
    return {
      emoji: "🍝",
      family: "Complex Carbs",
      vitamins: ["Magnesium", "Vit B1"],
    };
  }
  if (
    lower.includes("apple") ||
    lower.includes("pomme") ||
    lower.includes("kiwi") ||
    lower.includes("banana") ||
    lower.includes("banane") ||
    lower.includes("lemon") ||
    lower.includes("citron")
  ) {
    return {
      emoji: "🥝",
      family: "Fruits & Antioxidants",
      vitamins: ["Vit C++", "Antioxidants"],
    };
  }
  if (
    lower.includes("oil") ||
    lower.includes("huile") ||
    lower.includes("olive") ||
    lower.includes("walnut") ||
    lower.includes("noix") ||
    lower.includes("chia") ||
    lower.includes("almond")
  ) {
    return {
      emoji: "🫒",
      family: "Healthy Fats",
      vitamins: ["Omega-3", "Vit E"],
    };
  }
  if (
    lower.includes("cookie") ||
    lower.includes("biscuit") ||
    lower.includes("chips") ||
    lower.includes("soda") ||
    lower.includes("chocolat") ||
    lower.includes("ice cream")
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
    vitamins: ["Whole Nutrients"],
  };
}

export function parseReceiptText(rawText: string): ScannedReceiptItem[] {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ScannedReceiptItem[] = [];

  for (const line of lines) {
    if (/total|tva|vat|card|carte|thank|merci|receipt|ticket/i.test(line))
      continue;

    const priceMatch = line.match(/(\d+[.,]\d{2})\s*€?$/);
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1].replace(",", "."));
    if (isNaN(price) || price <= 0 || price > 200) continue;

    const rawLabel = line
      .slice(0, priceMatch.index)
      .replace(/[-.•*]+$/g, "")
      .trim();
    if (!rawLabel) continue;

    let quantity = 1.0;
    let unit: "kg" | "L" | "unit" = "kg";

    const gramsMatch = rawLabel.match(/(\d+)\s*g\b/i);
    const kgMatch = rawLabel.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
    const lMatch = rawLabel.match(/(\d+(?:[.,]\d+)?)\s*l\b/i);

    if (gramsMatch) {
      quantity = Number((parseInt(gramsMatch[1], 10) / 1000).toFixed(3));
      unit = "kg";
    } else if (kgMatch) {
      quantity = parseFloat(kgMatch[1].replace(",", "."));
      unit = "kg";
    } else if (lMatch) {
      quantity = parseFloat(lMatch[1].replace(",", "."));
      unit = "L";
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
    "PRODID:-//VitalBudget//BatchCooking Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((ev, idx) => {
    const cleanDate = ev.dateYmd.replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:vitalbudget-${cleanDate}-${idx}@vitalbudget.app`,
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
