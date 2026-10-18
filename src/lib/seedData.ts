export type NutritionalFamily =
  | "Veggies & Vitamins"
  | "Fruits & Antioxidants"
  | "Whole Proteins"
  | "Complex Carbs"
  | "Healthy Fats"
  | "Extras / Ultra-Processed";

export type VegSubFamily =
  | "Greens & Cruciferous"
  | "Orange & Red Veggies"
  | "Alliums & Roots"
  | "Legumes & Pulses";

export type UnitType = "kg" | "L" | "unit";

export interface BudgetEnvelope {
  id: string;
  ticker: string;
  name: string;
  allocated: number;
  spent: number;
  color: string;
  icon: string;
  trendPct: number;
  sparkline: number[];
}

export interface FixedExpense {
  id: string;
  name: string;
  ticker: string;
  amount: number;
  dayOfMonth: number;
  category: string;
  isPaid: boolean;
}

export interface Transaction {
  id: string;
  label: string;
  amount: number;
  date: string; // YYYY-MM-DD
  envelopeId: string;
  type: "expense" | "income";
  notes?: string;
}

export interface StapleProduct {
  id: string;
  name: string;
  emoji: string;
  family: NutritionalFamily;
  vegSubFamily?: VegSubFamily;
  defaultPrice: number;
  defaultQuantity: number;
  unit: UnitType;
  referencePricePerUnit: number;
  vitamins: string[];
  nutriDensity: number;
}

export interface GroceryItem {
  id: string;
  stapleId?: string;
  name: string;
  emoji: string;
  family: NutritionalFamily;
  vegSubFamily?: VegSubFamily;
  price: number;
  quantity: number;
  unit: UnitType;
  pricePerUnit: number;
  referencePricePerUnit: number;
  vitamins: string[];
  checked: boolean;
  purchasedAt: string;
}

export interface BatchIngredient {
  name: string;
  quantityLabel: string;
  cost: number;
}

export interface BatchMeal {
  id: string;
  title: string;
  emoji: string;
  totalPortions: number;
  remainingPortions: number;
  totalCost: number;
  costPerPortion: number;
  externalMealPrice: number;
  prepTimeMinutes: number;
  nutriScore: number;
  vitamins: string[];
  vegSubFamilies: VegSubFamily[];
  ingredients: BatchIngredient[];
  steps?: string[];
  macros?: {
    kcal: number;
    protein: string;
    carbs: string;
  };
  shelfLifeDays?: number;
  isFrozen?: boolean;
  lastCookedAt: string;
}

export const INITIAL_MONTHLY_INCOME = 2950;
export const INITIAL_SAVINGS_TARGET = 600;

export const SEED_ENVELOPES: BudgetEnvelope[] = [
  {
    id: "env-food",
    ticker: "NUTRI.PA",
    name: "Groceries & Whole Foods",
    allocated: 320,
    spent: 168.4,
    color: "#30D158",
    icon: "🥦",
    trendPct: -14.2,
    sparkline: [92, 85, 78, 72, 68, 61, 53],
  },
  {
    id: "env-resto",
    ticker: "DINING.PA",
    name: "Restaurants, Bars & Coffee",
    allocated: 180,
    spent: 112.5,
    color: "#FF9F0A",
    icon: "🍽️",
    trendPct: +4.8,
    sparkline: [25, 42, 58, 74, 89, 102, 112.5],
  },
  {
    id: "env-health",
    ticker: "VITAL.BIO",
    name: "Health, Gym & Supplements",
    allocated: 120,
    spent: 54.9,
    color: "#64D2FF",
    icon: "⚡",
    trendPct: -8.5,
    sparkline: [40, 40, 45, 48, 50, 54.9, 54.9],
  },
  {
    id: "env-mobil",
    ticker: "MOVE.EU",
    name: "Transit & Mobility",
    allocated: 140,
    spent: 68.0,
    color: "#0A84FF",
    icon: "🚆",
    trendPct: -6.1,
    sparkline: [30, 38, 45, 52, 60, 68, 68],
  },
  {
    id: "env-extra",
    ticker: "EXTRA.PL",
    name: "Lifestyle, Tech & Shopping",
    allocated: 200,
    spent: 164.0,
    color: "#FF453A",
    icon: "🎧",
    trendPct: +18.4,
    sparkline: [20, 45, 80, 110, 135, 150, 164],
  },
];

export const SEED_FIXED_EXPENSES: FixedExpense[] = [
  {
    id: "fix-1",
    name: "Rent & Building Charges",
    ticker: "RENT.FIX",
    amount: 790.0,
    dayOfMonth: 5,
    category: "Housing",
    isPaid: true,
  },
  {
    id: "fix-2",
    name: "Auto-Invest ETF (MSCI World)",
    ticker: "CW8.PA",
    amount: 450.0,
    dayOfMonth: 2,
    category: "Investing",
    isPaid: true,
  },
  {
    id: "fix-3",
    name: "Electricity & Utilities",
    ticker: "UTIL.NRJ",
    amount: 68.0,
    dayOfMonth: 10,
    category: "Housing",
    isPaid: true,
  },
  {
    id: "fix-4",
    name: "Fiber Internet + 5G Mobile Plan",
    ticker: "TEL.NET",
    amount: 39.99,
    dayOfMonth: 12,
    category: "Telecom",
    isPaid: true,
  },
  {
    id: "fix-5",
    name: "Gym & Fitness Membership",
    ticker: "GYM.PRO",
    amount: 34.9,
    dayOfMonth: 15,
    category: "Health",
    isPaid: true,
  },
  {
    id: "fix-6",
    name: "Home Insurance & iCloud+",
    ticker: "SAFE.CLD",
    amount: 21.9,
    dayOfMonth: 22,
    category: "Subscriptions",
    isPaid: false,
  },
];

export const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    label: "Monthly Net Salary",
    amount: 2950.0,
    date: "2026-10-01",
    envelopeId: "income",
    type: "income",
    notes: "Main monthly paycheck",
  },
  {
    id: "tx-2",
    label: "Lidl & Local Market — Whole Foods Basket",
    amount: 48.6,
    date: "2026-10-03",
    envelopeId: "env-food",
    type: "expense",
    notes: "Broccoli, free-range eggs, sardines, red lentils, rolled oats",
  },
  {
    id: "tx-3",
    label: "Ramen & Gyoza Night Out",
    amount: 26.5,
    date: "2026-10-05",
    envelopeId: "env-resto",
    type: "expense",
  },
  {
    id: "tx-4",
    label: "Whole Foods — Week 2 Batch Cooking",
    amount: 54.2,
    date: "2026-10-08",
    envelopeId: "env-food",
    type: "expense",
    notes: "Chicken breast, fresh spinach, sweet potatoes, citrus",
  },
  {
    id: "tx-5",
    label: "Monthly Transit Pass",
    amount: 68.0,
    date: "2026-10-10",
    envelopeId: "env-mobil",
    type: "expense",
  },
  {
    id: "tx-6",
    label: "Magnesium Bisglycinate & Omega-3",
    amount: 54.9,
    date: "2026-10-12",
    envelopeId: "env-health",
    type: "expense",
  },
  {
    id: "tx-7",
    label: "MacBook Hub & Aluminum Stand",
    amount: 164.0,
    date: "2026-10-14",
    envelopeId: "env-extra",
    type: "expense",
  },
  {
    id: "tx-8",
    label: "Supermarket Drive — Week 3 Staples",
    amount: 65.6,
    date: "2026-10-16",
    envelopeId: "env-food",
    type: "expense",
    notes: "Canned tuna, 5kg basmati rice, extra virgin olive oil, kiwis",
  },
  {
    id: "tx-9",
    label: "Weekend Brunch & Specialty Coffee",
    amount: 86.0,
    date: "2026-10-17",
    envelopeId: "env-resto",
    type: "expense",
  },
];

export const SEED_STAPLE_PRODUCTS: StapleProduct[] = [
  {
    id: "st-1",
    name: "Fresh / Frozen Broccoli Florets",
    emoji: "🥦",
    family: "Veggies & Vitamins",
    vegSubFamily: "Greens & Cruciferous",
    defaultPrice: 2.29,
    defaultQuantity: 1.0,
    unit: "kg",
    referencePricePerUnit: 2.5,
    vitamins: ["Vit C", "Vit K", "Folate (B9)", "Sulforaphane"],
    nutriDensity: 98,
  },
  {
    id: "st-2",
    name: "Fresh Leaf Spinach",
    emoji: "🥬",
    family: "Veggies & Vitamins",
    vegSubFamily: "Greens & Cruciferous",
    defaultPrice: 1.99,
    defaultQuantity: 1.0,
    unit: "kg",
    referencePricePerUnit: 2.2,
    vitamins: ["Iron", "Magnesium", "Vit A", "Vit K"],
    nutriDensity: 97,
  },
  {
    id: "st-3",
    name: "Bulk Carrots & Butternut Squash",
    emoji: "🥕",
    family: "Veggies & Vitamins",
    vegSubFamily: "Orange & Red Veggies",
    defaultPrice: 1.85,
    defaultQuantity: 1.5,
    unit: "kg",
    referencePricePerUnit: 1.4,
    vitamins: ["Beta-Carotene (Vit A)", "Potassium", "Fiber"],
    nutriDensity: 91,
  },
  {
    id: "st-4",
    name: "Red Bell Peppers & Crushed Tomatoes",
    emoji: "🫑",
    family: "Veggies & Vitamins",
    vegSubFamily: "Orange & Red Veggies",
    defaultPrice: 2.95,
    defaultQuantity: 1.0,
    unit: "kg",
    referencePricePerUnit: 3.1,
    vitamins: ["Vit C++", "Lycopene", "Antioxidants"],
    nutriDensity: 94,
  },
  {
    id: "st-5",
    name: "Yellow Onions, Garlic & Leeks",
    emoji: "🧅",
    family: "Veggies & Vitamins",
    vegSubFamily: "Alliums & Roots",
    defaultPrice: 1.69,
    defaultQuantity: 1.0,
    unit: "kg",
    referencePricePerUnit: 1.8,
    vitamins: ["Quercetin", "Allicin", "Prebiotics"],
    nutriDensity: 92,
  },
  {
    id: "st-6",
    name: "Dry Red Lentils & Chickpeas",
    emoji: "🫘",
    family: "Veggies & Vitamins",
    vegSubFamily: "Legumes & Pulses",
    defaultPrice: 2.45,
    defaultQuantity: 1.0,
    unit: "kg",
    referencePricePerUnit: 2.6,
    vitamins: ["Iron", "Magnesium", "Zinc", "Plant Protein"],
    nutriDensity: 96,
  },
  {
    id: "st-7",
    name: "Free-Range Eggs (18-Pack)",
    emoji: "🥚",
    family: "Whole Proteins",
    defaultPrice: 4.65,
    defaultQuantity: 1.08,
    unit: "kg",
    referencePricePerUnit: 4.5,
    vitamins: ["Vit B12", "Choline", "Vit D", "Selenium"],
    nutriDensity: 99,
  },
  {
    id: "st-8",
    name: "Wild Sardines & Mackerel Fillets",
    emoji: "🐟",
    family: "Whole Proteins",
    defaultPrice: 5.4,
    defaultQuantity: 0.6,
    unit: "kg",
    referencePricePerUnit: 9.2,
    vitamins: ["Omega-3", "Vit B12", "Vit D", "Calcium"],
    nutriDensity: 98,
  },
  {
    id: "st-9",
    name: "Free-Range Chicken Breast (1kg Pack)",
    emoji: "🍗",
    family: "Whole Proteins",
    defaultPrice: 9.8,
    defaultQuantity: 1.0,
    unit: "kg",
    referencePricePerUnit: 10.4,
    vitamins: ["Vit B6", "Vit B3", "Zinc", "24g Protein/100g"],
    nutriDensity: 90,
  },
  {
    id: "st-10",
    name: "Canned Skipjack Tuna in Brine (3x140g)",
    emoji: "🥫",
    family: "Whole Proteins",
    defaultPrice: 3.95,
    defaultQuantity: 0.42,
    unit: "kg",
    referencePricePerUnit: 9.8,
    vitamins: ["Vit B12", "Selenium", "Iodine"],
    nutriDensity: 89,
  },
  {
    id: "st-11",
    name: "Whole Rolled Oats (1kg)",
    emoji: "🌾",
    family: "Complex Carbs",
    defaultPrice: 1.49,
    defaultQuantity: 1.0,
    unit: "kg",
    referencePricePerUnit: 1.65,
    vitamins: ["Magnesium", "Beta-Glucans", "Iron", "Vit B1"],
    nutriDensity: 95,
  },
  {
    id: "st-12",
    name: "Basmati Rice & Sweet Potatoes",
    emoji: "🍠",
    family: "Complex Carbs",
    vegSubFamily: "Orange & Red Veggies",
    defaultPrice: 2.35,
    defaultQuantity: 1.0,
    unit: "kg",
    referencePricePerUnit: 2.4,
    vitamins: ["Vit A", "Potassium", "Low-GI Carbs"],
    nutriDensity: 91,
  },
  {
    id: "st-13",
    name: "Green Kiwis, Lemons & Apples",
    emoji: "🥝",
    family: "Fruits & Antioxidants",
    defaultPrice: 2.99,
    defaultQuantity: 1.0,
    unit: "kg",
    referencePricePerUnit: 3.2,
    vitamins: ["Vit C++", "Polyphenols", "Potassium"],
    nutriDensity: 96,
  },
  {
    id: "st-14",
    name: "Extra Virgin Olive Oil & Chia Seeds",
    emoji: "🫒",
    family: "Healthy Fats",
    defaultPrice: 8.5,
    defaultQuantity: 1.0,
    unit: "L",
    referencePricePerUnit: 8.9,
    vitamins: ["Omega-3", "Omega-9", "Vit E"],
    nutriDensity: 93,
  },
  {
    id: "st-15",
    name: "Ultra-Processed Cookies / Snacks",
    emoji: "🍪",
    family: "Extras / Ultra-Processed",
    defaultPrice: 3.49,
    defaultQuantity: 0.25,
    unit: "kg",
    referencePricePerUnit: 11.5,
    vitamins: [],
    nutriDensity: 15,
  },
];

export const SEED_GROCERY_ITEMS: GroceryItem[] = [
  {
    id: "gr-1",
    stapleId: "st-1",
    name: "Fresh / Frozen Broccoli Florets",
    emoji: "🥦",
    family: "Veggies & Vitamins",
    vegSubFamily: "Greens & Cruciferous",
    price: 2.29,
    quantity: 1.0,
    unit: "kg",
    pricePerUnit: 2.29,
    referencePricePerUnit: 2.5,
    vitamins: ["Vit C", "Vit K", "Folate (B9)"],
    checked: true,
    purchasedAt: "2026-10-18T10:00:00Z",
  },
  {
    id: "gr-2",
    stapleId: "st-7",
    name: "Free-Range Eggs (18-Pack)",
    emoji: "🥚",
    family: "Whole Proteins",
    price: 4.65,
    quantity: 1.08,
    unit: "kg",
    pricePerUnit: 4.31,
    referencePricePerUnit: 4.5,
    vitamins: ["Vit B12", "Choline", "Vit D"],
    checked: true,
    purchasedAt: "2026-10-18T10:05:00Z",
  },
  {
    id: "gr-3",
    stapleId: "st-6",
    name: "Dry Red Lentils & Chickpeas",
    emoji: "🫘",
    family: "Veggies & Vitamins",
    vegSubFamily: "Legumes & Pulses",
    price: 2.45,
    quantity: 1.0,
    unit: "kg",
    pricePerUnit: 2.45,
    referencePricePerUnit: 2.6,
    vitamins: ["Iron", "Magnesium", "Zinc"],
    checked: true,
    purchasedAt: "2026-10-18T10:10:00Z",
  },
  {
    id: "gr-4",
    stapleId: "st-3",
    name: "Bulk Carrots & Butternut Squash",
    emoji: "🥕",
    family: "Veggies & Vitamins",
    vegSubFamily: "Orange & Red Veggies",
    price: 1.85,
    quantity: 1.5,
    unit: "kg",
    pricePerUnit: 1.23,
    referencePricePerUnit: 1.4,
    vitamins: ["Beta-Carotene (Vit A)", "Potassium"],
    checked: false,
    purchasedAt: "2026-10-18T10:15:00Z",
  },
  {
    id: "gr-5",
    stapleId: "st-5",
    name: "Yellow Onions, Garlic & Leeks",
    emoji: "🧅",
    family: "Veggies & Vitamins",
    vegSubFamily: "Alliums & Roots",
    price: 1.69,
    quantity: 1.0,
    unit: "kg",
    pricePerUnit: 1.69,
    referencePricePerUnit: 1.8,
    vitamins: ["Quercetin", "Allicin"],
    checked: false,
    purchasedAt: "2026-10-18T10:20:00Z",
  },
  {
    id: "gr-6",
    stapleId: "st-8",
    name: "Wild Sardines & Mackerel Fillets",
    emoji: "🐟",
    family: "Whole Proteins",
    price: 5.4,
    quantity: 0.6,
    unit: "kg",
    pricePerUnit: 9.0,
    referencePricePerUnit: 9.2,
    vitamins: ["Omega-3", "Vit B12", "Calcium"],
    checked: false,
    purchasedAt: "2026-10-18T10:25:00Z",
  },
  {
    id: "gr-7",
    stapleId: "st-11",
    name: "Whole Rolled Oats (1kg)",
    emoji: "🌾",
    family: "Complex Carbs",
    price: 1.49,
    quantity: 1.0,
    unit: "kg",
    pricePerUnit: 1.49,
    referencePricePerUnit: 1.65,
    vitamins: ["Magnesium", "Iron", "Beta-Glucans"],
    checked: true,
    purchasedAt: "2026-10-18T10:30:00Z",
  },
  {
    id: "gr-8",
    stapleId: "st-15",
    name: "Dark Chocolate Cookies (Extra)",
    emoji: "🍪",
    family: "Extras / Ultra-Processed",
    price: 3.19,
    quantity: 0.25,
    unit: "kg",
    pricePerUnit: 12.76,
    referencePricePerUnit: 11.5,
    vitamins: [],
    checked: false,
    purchasedAt: "2026-10-18T10:35:00Z",
  },
];

export const SEED_BATCH_MEALS: BatchMeal[] = [
  {
    id: "batch-1",
    title: "Whole-Wheat Tuna, Lemon Pesto & Spinach Pasta",
    emoji: "🍝",
    totalPortions: 5,
    remainingPortions: 4,
    totalCost: 8.45,
    costPerPortion: 1.69,
    externalMealPrice: 14.5,
    prepTimeMinutes: 20,
    nutriScore: 94,
    shelfLifeDays: 3,
    vitamins: ["Vit B12", "Vit C", "Iron", "Omega-3", "Magnesium"],
    vegSubFamilies: ["Greens & Cruciferous", "Alliums & Roots"],
    macros: { kcal: 540, protein: "34g", carbs: "62g" },
    ingredients: [
      { name: "Whole-wheat pasta", quantityLabel: "500g", cost: 1.35 },
      { name: "Drained canned tuna in brine (2 cans)", quantityLabel: "280g", cost: 2.9 },
      { name: "Fresh or frozen leaf spinach", quantityLabel: "400g", cost: 1.6 },
      { name: "Basil pesto, juice of 2 lemons & 2 garlic cloves", quantityLabel: "190g", cost: 2.6 },
    ],
    steps: [
      "Boil 500g of whole-wheat pasta in salted water until al dente (save 1 ladle of pasta water).",
      "Meanwhile, sauté the spinach and minced garlic for 4 mins with a drizzle of olive oil.",
      "Off the heat, toss the pasta with flaked tuna, wilted spinach, pesto, and pasta water.",
      "Squeeze fresh lemon juice right before packing to preserve Vitamin C and boost iron absorption.",
      "Divide into 5 airtight glass containers (keeps 3 days in the fridge at 4°C).",
    ],
    lastCookedAt: "2026-10-18T09:00:00Z",
  },
  {
    id: "batch-2",
    title: "Chicken Curry with Green Veggies, Carrots & Basmati Rice",
    emoji: "🍛",
    totalPortions: 6,
    remainingPortions: 5,
    totalCost: 13.8,
    costPerPortion: 2.3,
    externalMealPrice: 15.9,
    prepTimeMinutes: 35,
    nutriScore: 96,
    shelfLifeDays: 4,
    vitamins: ["Vit C", "Vit A", "Magnesium", "Iron", "Zinc"],
    vegSubFamilies: [
      "Greens & Cruciferous",
      "Orange & Red Veggies",
      "Alliums & Roots",
    ],
    macros: { kcal: 590, protein: "42g", carbs: "64g" },
    ingredients: [
      { name: "Diced chicken breast", quantityLabel: "750g", cost: 7.35 },
      { name: "Broccoli + Zucchini + Sliced carrots", quantityLabel: "900g", cost: 2.45 },
      { name: "Basmati rice", quantityLabel: "450g", cost: 1.2 },
      { name: "Light coconut milk (400ml), curry, turmeric & onions", quantityLabel: "400ml", cost: 2.8 },
    ],
    steps: [
      "Cook basmati rice (1 part rice to 1.5 parts water, 12 mins covered).",
      "Sear 2 diced onions and chicken cubes in a large skillet with 2 tbsp curry powder, turmeric & black pepper.",
      "Add sliced carrots and broccoli florets, then pour in 400ml light coconut milk.",
      "Simmer 12-15 mins on low heat so the vegetables stay tender-crisp.",
      "Portion evenly into 6 meal-prep containers.",
    ],
    lastCookedAt: "2026-10-17T18:30:00Z",
  },
  {
    id: "batch-3",
    title: "Apple, Chia Seeds & Cinnamon Overnight Oats",
    emoji: "🥣",
    totalPortions: 5,
    remainingPortions: 3,
    totalCost: 4.75,
    costPerPortion: 0.95,
    externalMealPrice: 8.5,
    prepTimeMinutes: 10,
    nutriScore: 95,
    shelfLifeDays: 5,
    vitamins: ["Magnesium", "Omega-3", "Iron", "Vit C", "Fiber"],
    vegSubFamilies: ["Legumes & Pulses"],
    macros: { kcal: 430, protein: "21g", carbs: "54g" },
    ingredients: [
      { name: "Whole rolled oats", quantityLabel: "400g", cost: 0.65 },
      { name: "Chia seeds & 100% peanut butter", quantityLabel: "120g", cost: 1.45 },
      { name: "Greek yogurt / Skyr or soy milk", quantityLabel: "600g", cost: 1.55 },
      { name: "Diced apples, kiwis & ground cinnamon", quantityLabel: "450g", cost: 1.1 },
    ],
    steps: [
      "Line up 5 jars or airtight containers on the counter.",
      "Add to each jar: 80g rolled oats, 1 tbsp chia seeds, and a pinch of cinnamon.",
      "Stir in 120g Skyr/Greek yogurt and a splash of water or milk.",
      "Top with diced apples and refrigerate overnight (keeps up to 5 days).",
    ],
    lastCookedAt: "2026-10-16T20:00:00Z",
  },
  {
    id: "batch-4",
    title: "Red Lentil, Sweet Potato & Spinach Coconut Dahl",
    emoji: "🍲",
    totalPortions: 6,
    remainingPortions: 6,
    totalCost: 7.2,
    costPerPortion: 1.2,
    externalMealPrice: 14.0,
    prepTimeMinutes: 28,
    nutriScore: 98,
    shelfLifeDays: 5,
    vitamins: ["Iron", "Magnesium", "Vit A", "Vit C", "Folate (B9)"],
    vegSubFamilies: [
      "Legumes & Pulses",
      "Orange & Red Veggies",
      "Greens & Cruciferous",
      "Alliums & Roots",
    ],
    macros: { kcal: 480, protein: "22g", carbs: "68g" },
    ingredients: [
      { name: "Rinsed dry red lentils", quantityLabel: "450g", cost: 1.35 },
      { name: "Cubed sweet potatoes & carrots", quantityLabel: "700g", cost: 1.85 },
      { name: "Spinach & crushed tomatoes (1 can)", quantityLabel: "600g", cost: 2.2 },
      { name: "Garlic, fresh ginger, onions & coconut milk", quantityLabel: "300g", cost: 1.8 },
    ],
    steps: [
      "Sauté diced onion, garlic, and grated ginger for 3 mins with cumin and garam masala.",
      "Add sweet potato cubes, rinsed red lentils, crushed tomatoes, and 700ml water.",
      "Simmer gently for 18 mins until lentils and sweet potatoes are tender.",
      "Stir in coconut milk and fresh spinach for the last 2 mins.",
    ],
    lastCookedAt: "2026-10-18T11:30:00Z",
  },
];

export const RECIPE_IDEAS_CATALOG: Omit<BatchMeal, "id" | "lastCookedAt">[] = [
  {
    title: "Homemade Beef Bolognese Pasta (5% Lean Beef, Carrots & Tomatoes)",
    emoji: "🍝",
    totalPortions: 5,
    remainingPortions: 5,
    totalCost: 9.25,
    costPerPortion: 1.85,
    externalMealPrice: 14.9,
    prepTimeMinutes: 25,
    nutriScore: 93,
    shelfLifeDays: 3,
    vitamins: ["Heme Iron", "Vit B12", "Lycopene", "Zinc", "Vit C"],
    vegSubFamilies: ["Orange & Red Veggies", "Alliums & Roots"],
    macros: { kcal: 560, protein: "36g", carbs: "64g" },
    ingredients: [
      { name: "5% lean ground beef", quantityLabel: "500g", cost: 5.4 },
      { name: "Whole-wheat spaghetti or penne", quantityLabel: "500g", cost: 1.25 },
      { name: "Crushed tomatoes (800g) & tomato paste", quantityLabel: "800g", cost: 1.5 },
      { name: "Finely diced carrots, onions & garlic", quantityLabel: "400g", cost: 1.1 },
    ],
    steps: [
      "Finely dice the onion, garlic, and carrots (brunoise).",
      "Sauté the veggies for 5 mins in olive oil, then brown the 5% lean ground beef over high heat.",
      "Pour in 800g crushed tomatoes, oregano, and simmer for 15 mins.",
      "Cook pasta al dente, combine, and pack into 5 containers (Auto Use-By: 3 days in fridge or freeze).",
    ],
  },
  {
    title: "Chili Sin Carne (Kidney Beans, Corn, Bell Peppers & Rice)",
    emoji: "🌶️",
    totalPortions: 6,
    remainingPortions: 6,
    totalCost: 7.8,
    costPerPortion: 1.3,
    externalMealPrice: 14.0,
    prepTimeMinutes: 25,
    nutriScore: 96,
    shelfLifeDays: 5,
    vitamins: ["Iron", "Vit C++", "Magnesium", "Fiber", "Potassium"],
    vegSubFamilies: ["Legumes & Pulses", "Orange & Red Veggies", "Alliums & Roots"],
    macros: { kcal: 510, protein: "23g", carbs: "74g" },
    ingredients: [
      { name: "Kidney beans & chickpeas (2 cans)", quantityLabel: "800g", cost: 2.2 },
      { name: "Red bell peppers, carrots & onions", quantityLabel: "600g", cost: 2.1 },
      { name: "Crushed tomatoes, sweetcorn, cumin & oregano", quantityLabel: "500g", cost: 1.9 },
      { name: "Brown or basmati rice", quantityLabel: "450g", cost: 1.6 },
    ],
    steps: [
      "Sauté onions, diced carrots, and red bell peppers for 5 mins with cumin and smoked paprika.",
      "Add crushed tomatoes, rinsed kidney beans, and sweetcorn.",
      "Simmer covered for 15 mins while the rice cooks separately.",
      "Finish with a squeeze of lime juice and divide into 6 boxes.",
    ],
  },
  {
    title: "Sheet-Pan Oven Frittata: 12 Eggs, Broccoli, Leeks & Feta",
    emoji: "🍳",
    totalPortions: 5,
    remainingPortions: 5,
    totalCost: 7.9,
    costPerPortion: 1.58,
    externalMealPrice: 13.5,
    prepTimeMinutes: 25,
    nutriScore: 97,
    shelfLifeDays: 4,
    vitamins: ["Vit B12", "Choline", "Vit D", "Vit K", "Calcium"],
    vegSubFamilies: ["Greens & Cruciferous", "Alliums & Roots"],
    macros: { kcal: 440, protein: "29g", carbs: "18g" },
    ingredients: [
      { name: "Free-range eggs (x12)", quantityLabel: "12 eggs", cost: 3.1 },
      { name: "Small broccoli florets & sliced leeks", quantityLabel: "700g", cost: 2.2 },
      { name: "Diced potatoes", quantityLabel: "500g", cost: 0.9 },
      { name: "Crumbled feta & herbs", quantityLabel: "150g", cost: 1.7 },
    ],
    steps: [
      "Preheat oven to 190°C (375°F). Sauté diced potatoes, leeks, and broccoli for 8 mins.",
      "Whisk 12 eggs in a bowl with black pepper, herbs, and crumbled feta.",
      "Spread vegetables in a baking dish and pour the egg mixture over.",
      "Bake for 18 mins until golden, then slice into 5 portions.",
    ],
  },
  {
    title: "Omega-3 Mackerel/Sardine Stir-Fry, Crunchy Cabbage & Noodles",
    emoji: "🥢",
    totalPortions: 4,
    remainingPortions: 4,
    totalCost: 7.4,
    costPerPortion: 1.85,
    externalMealPrice: 15.0,
    prepTimeMinutes: 18,
    nutriScore: 98,
    shelfLifeDays: 3,
    vitamins: ["Omega-3++", "Vit D", "Vit B12", "Vit C", "Selenium"],
    vegSubFamilies: [
      "Greens & Cruciferous",
      "Orange & Red Veggies",
      "Alliums & Roots",
    ],
    macros: { kcal: 560, protein: "35g", carbs: "58g" },
    ingredients: [
      { name: "Canned mackerel or sardine fillets (3 cans)", quantityLabel: "450g", cost: 3.8 },
      { name: "Shredded cabbage, grated carrots & onions", quantityLabel: "700g", cost: 1.6 },
      { name: "Whole-wheat or buckwheat noodles", quantityLabel: "350g", cost: 1.4 },
      { name: "Soy sauce, garlic, ginger & lemon", quantityLabel: "60ml", cost: 0.6 },
    ],
    steps: [
      "Boil noodles for 4 mins then drain.",
      "Stir-fry shredded cabbage, carrots, garlic, and ginger over high heat for 6 mins.",
      "Toss in noodles, soy sauce, and flaked mackerel off the heat to protect Omega-3 fatty acids.",
    ],
  },
];
