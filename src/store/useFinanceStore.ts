"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  BudgetEnvelope,
  FixedExpense,
  Transaction,
  StapleProduct,
  GroceryItem,
  BatchMeal,
  NutritionalFamily,
  VegSubFamily,
  UnitType,
  INITIAL_MONTHLY_INCOME,
  INITIAL_SAVINGS_TARGET,
  SEED_ENVELOPES,
  SEED_FIXED_EXPENSES,
  SEED_TRANSACTIONS,
  SEED_STAPLE_PRODUCTS,
  SEED_GROCERY_ITEMS,
  SEED_BATCH_MEALS,
} from "@/lib/seedData";
import {
  calculateUnitPrice,
  detectShelfLifeDays,
  ScannedReceiptItem,
} from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase";
import type {
  AgentActionType,
  AgentPersona,
  ChatTurn,
} from "@/app/api/agent/route";

export type ActiveTab = "stocks" | "groceries" | "batch" | "analytics";

export interface SavedAgendaEventItem {
  id: string;
  title: string;
  dateLabel: string;
  startIso: string;
  endIso: string;
  googleCalendarUrl: string;
  description: string;
}

export interface FinanceStoreState {
  activeTab: ActiveTab;
  isQuickAddOpen: boolean;
  currentMonthLabel: string;
  monthlyIncome: number;
  savingsTarget: number;
  envelopes: BudgetEnvelope[];
  fixedExpenses: FixedExpense[];
  transactions: Transaction[];
  stapleProducts: StapleProduct[];
  groceryItems: GroceryItem[];
  batchMeals: BatchMeal[];
  restoSkippedDates: string[];
  supabaseStatus: "local" | "syncing" | "connected" | "error";
  lastSyncedAt: string | null;

  // Persisted AI Agent State (survives tab switches & page reloads)
  agentPersona: AgentPersona;
  agentReply: string | null;
  agentChatHistory: ChatTurn[];
  agentLastAction: AgentActionType | null;
  agentLastProvider: string;
  savedAgendaEvents: SavedAgendaEventItem[];

  // Navigation & UI
  setActiveTab: (tab: ActiveTab) => void;
  setQuickAddOpen: (open: boolean) => void;
  setCurrentMonthLabel: (label: string) => void;

  // Agent State Actions
  setAgentPersona: (persona: AgentPersona) => void;
  setAgentTurnState: (payload: {
    reply: string | null;
    action?: AgentActionType | null;
    provider?: string;
    userMessage?: string;
  }) => void;
  clearAgentHistory: () => void;
  addSavedAgendaEvent: (ev: SavedAgendaEventItem) => void;
  removeSavedAgendaEvent: (id: string) => void;

  // Monthly Lifecycle & Real Data Controls
  startNewMonth: (nextMonthLabel: string) => void;
  clearAllDemoData: () => void;

  // Budget & Transactions
  setDisposableBalance: (targetDisposable: number) => void;
  updateBudgetTargets: (income: number, savingsTarget: number) => void;
  addTransaction: (
    tx: Omit<Transaction, "id"> & { replaceBaseSalary?: boolean }
  ) => void;
  deleteTransaction: (id: string) => void;
  toggleFixedExpensePaid: (id: string) => void;
  addFixedExpense: (expense: Omit<FixedExpense, "id">) => void;
  updateFixedExpense: (id: string, updates: Partial<FixedExpense>) => void;
  deleteFixedExpense: (id: string) => void;
  updateEnvelopeAllocation: (envelopeId: string, newAllocation: number) => void;
  updateEnvelopeSpent: (envelopeId: string, newSpent: number) => void;

  // Groceries, Nutrients & Receipt Scanner
  addStapleToGroceries: (
    staple: StapleProduct,
    customPrice?: number,
    customQty?: number
  ) => void;
  addCustomGroceryItem: (item: {
    name: string;
    emoji: string;
    family: NutritionalFamily;
    vegSubFamily?: VegSubFamily;
    price: number;
    quantity: number;
    unit: UnitType;
    referencePricePerUnit?: number;
    vitamins: string[];
  }) => void;
  importScannedReceipt: (
    items: ScannedReceiptItem[],
    storeLabel?: string
  ) => { totalSpent: number; updatedCount: number };
  toggleGroceryChecked: (id: string) => void;
  removeGroceryItem: (id: string) => void;
  clearCheckedGroceries: () => void;
  checkoutGroceriesToBudget: () => number;

  // Batch Cooking, Use-By Date (DLC) & Evening Planner
  consumeBatchPortion: (id: string) => void;
  restockBatchMeal: (id: string) => void;
  toggleFreezeBatchMeal: (id: string) => void;
  addBatchMeal: (
    meal: Omit<BatchMeal, "id" | "costPerPortion" | "lastCookedAt">
  ) => void;
  deleteBatchMeal: (id: string) => void;
  toggleRestoDate: (dateYmd: string) => void;

  // Data & Supabase
  resetToSeedData: () => void;
  importStateJson: (data: Partial<FinanceStoreState>) => void;
  syncWithSupabase: () => Promise<{ ok: boolean; message: string }>;
}

export const useFinanceStore = create<FinanceStoreState>()(
  persist(
    (set, get) => ({
      activeTab: "stocks",
      isQuickAddOpen: false,
      currentMonthLabel: "October 2026",
      monthlyIncome: INITIAL_MONTHLY_INCOME,
      savingsTarget: INITIAL_SAVINGS_TARGET,
      envelopes: SEED_ENVELOPES,
      fixedExpenses: SEED_FIXED_EXPENSES,
      transactions: SEED_TRANSACTIONS,
      stapleProducts: SEED_STAPLE_PRODUCTS,
      groceryItems: SEED_GROCERY_ITEMS,
      batchMeals: SEED_BATCH_MEALS,
      restoSkippedDates: [],
      supabaseStatus: "local",
      lastSyncedAt: null,

      agentPersona: "finance",
      agentReply: null,
      agentChatHistory: [],
      agentLastAction: null,
      agentLastProvider: "free-cloud-llm-20b",
      savedAgendaEvents: [],

      setActiveTab: (tab) => set({ activeTab: tab }),
      setQuickAddOpen: (open) => set({ isQuickAddOpen: open }),
      setCurrentMonthLabel: (label) => set({ currentMonthLabel: label }),

      setAgentPersona: (persona) => set({ agentPersona: persona }),
      setAgentTurnState: ({ reply, action, provider, userMessage }) =>
        set((state) => {
          const nextHistory = userMessage && reply
            ? [
                ...state.agentChatHistory.slice(-10),
                { role: "user" as const, content: userMessage },
                { role: "assistant" as const, content: reply },
              ]
            : state.agentChatHistory;

          return {
            agentReply: reply,
            agentLastAction:
              action !== undefined ? action : state.agentLastAction,
            agentLastProvider: provider || state.agentLastProvider,
            agentChatHistory: nextHistory,
          };
        }),
      clearAgentHistory: () =>
        set({
          agentReply: null,
          agentChatHistory: [],
          agentLastAction: null,
        }),
      addSavedAgendaEvent: (ev) =>
        set((state) => ({
          savedAgendaEvents: [ev, ...state.savedAgendaEvents].slice(0, 10),
        })),
      removeSavedAgendaEvent: (id) =>
        set((state) => ({
          savedAgendaEvents: state.savedAgendaEvents.filter((e) => e.id !== id),
        })),

      setDisposableBalance: (targetDisposable) =>
        set((state) => {
          const cleanTarget = Number(targetDisposable.toFixed(2));
          const totalFixed = state.fixedExpenses.reduce(
            (sum, f) => sum + f.amount,
            0
          );
          const totalVariableSpent = state.envelopes.reduce(
            (sum, e) => sum + e.spent,
            0
          );
          const requiredIncome = Math.max(
            0,
            Number(
              (
                cleanTarget +
                totalFixed +
                state.savingsTarget +
                totalVariableSpent
              ).toFixed(2)
            )
          );

          const todayYmd = new Date().toISOString().split("T")[0];
          const existingSalaryTxIndex = state.transactions.findIndex(
            (t) =>
              t.type === "income" &&
              /salary|salaire|income|ajustement solde/i.test(t.label)
          );

          let updatedTransactions = [...state.transactions];
          if (existingSalaryTxIndex >= 0) {
            updatedTransactions[existingSalaryTxIndex] = {
              ...updatedTransactions[existingSalaryTxIndex],
              label: `Solde ajusté par Kora (Reste à vivre : ${cleanTarget.toFixed(2)} €)`,
              amount: requiredIncome,
              date: todayYmd,
            };
          } else {
            updatedTransactions = [
              {
                id: `tx-salary-${Date.now()}`,
                label: `Solde ajusté par Kora (Reste à vivre : ${cleanTarget.toFixed(2)} €)`,
                amount: requiredIncome,
                date: todayYmd,
                envelopeId: "income",
                type: "income",
              },
              ...updatedTransactions,
            ];
          }

          return {
            monthlyIncome: requiredIncome,
            transactions: updatedTransactions,
          };
        }),

      startNewMonth: (nextMonthLabel) =>
        set((state) => ({
          currentMonthLabel: nextMonthLabel,
          envelopes: state.envelopes.map((env) => ({
            ...env,
            spent: 0,
            trendPct: 0,
            sparkline: [0, 0, 0, 0, 0, 0, 0],
          })),
          fixedExpenses: state.fixedExpenses.map((fix) => ({
            ...fix,
            isPaid: false,
          })),
          transactions: [
            {
              id: `tx-salary-${Date.now()}`,
              label: `Monthly Net Salary (${nextMonthLabel})`,
              amount: state.monthlyIncome,
              date: new Date().toISOString().split("T")[0],
              envelopeId: "income",
              type: "income",
            },
          ],
          restoSkippedDates: [],
        })),

      clearAllDemoData: () =>
        set((state) => ({
          monthlyIncome: 0,
          savingsTarget: 0,
          envelopes: state.envelopes.map((env) => ({
            ...env,
            spent: 0,
            trendPct: 0,
            sparkline: [0, 0, 0, 0, 0, 0, 0],
          })),
          transactions: [],
          groceryItems: [],
          batchMeals: [],
          restoSkippedDates: [],
        })),

      // Updating base salary in Setup Month also synchronizes the main salary transaction (never doubles!)
      updateBudgetTargets: (income, savingsTarget) =>
        set((state) => {
          const cleanIncome = Math.max(0, Number(income.toFixed(2)));
          const cleanSavings = Math.max(0, Number(savingsTarget.toFixed(2)));

          const existingSalaryTxIndex = state.transactions.findIndex(
            (t) =>
              t.type === "income" &&
              /salary|salaire|income/i.test(t.label)
          );

          let updatedTransactions = [...state.transactions];
          if (existingSalaryTxIndex >= 0) {
            updatedTransactions[existingSalaryTxIndex] = {
              ...updatedTransactions[existingSalaryTxIndex],
              amount: cleanIncome,
            };
          } else if (cleanIncome > 0) {
            updatedTransactions = [
              {
                id: `tx-salary-${Date.now()}`,
                label: "Monthly Net Salary",
                amount: cleanIncome,
                date: new Date().toISOString().split("T")[0],
                envelopeId: "income",
                type: "income",
              },
              ...updatedTransactions,
            ];
          }

          return {
            monthlyIncome: cleanIncome,
            savingsTarget: cleanSavings,
            transactions: updatedTransactions,
          };
        }),

      addTransaction: (tx) => {
        const { replaceBaseSalary, ...cleanTx } = tx;
        const id = `tx-${Date.now()}`;
        const newTx: Transaction = { ...cleanTx, id };

        set((state) => {
          // If it's an expense, add to the matching envelope
          const updatedEnvelopes =
            cleanTx.type === "expense"
              ? state.envelopes.map((env) => {
                  if (env.id !== cleanTx.envelopeId) return env;
                  const newSpent = Number(
                    (env.spent + cleanTx.amount).toFixed(2)
                  );
                  const ratioPct =
                    env.allocated > 0
                      ? Number(
                          (
                            ((newSpent - env.allocated * 0.55) /
                              env.allocated) *
                            100
                          ).toFixed(1)
                        )
                      : env.trendPct;
                  return {
                    ...env,
                    spent: newSpent,
                    trendPct: ratioPct,
                    sparkline: [...env.sparkline.slice(1), newSpent],
                  };
                })
              : state.envelopes;

          // If it's an income transaction:
          // - If replaceBaseSalary is true (or label says Salary/Salaire), it SETS the base salary instead of doubling!
          // - Otherwise (Bonus / Side Income), it adds to monthlyIncome.
          const isSalaryReplacement =
            cleanTx.type === "income" &&
            (replaceBaseSalary || /salary|salaire/i.test(cleanTx.label));

          let updatedIncome = state.monthlyIncome;
          let filteredPrevTransactions = state.transactions;

          if (cleanTx.type === "income") {
            if (isSalaryReplacement) {
              // Remove any previous main salary transaction so it doesn't duplicate, and set monthlyIncome = cleanTx.amount
              const oldSalaryTxs = state.transactions.filter(
                (t) =>
                  t.type === "income" && /salary|salaire/i.test(t.label)
              );
              const bonusSum = state.transactions
                .filter(
                  (t) =>
                    t.type === "income" && !/salary|salaire/i.test(t.label)
                )
                .reduce((s, t) => s + t.amount, 0);

              filteredPrevTransactions =
                oldSalaryTxs.length > 0
                  ? state.transactions.filter(
                      (t) =>
                        !(
                          t.type === "income" &&
                          /salary|salaire/i.test(t.label)
                        )
                    )
                  : state.transactions;

              updatedIncome = Number((cleanTx.amount + bonusSum).toFixed(2));
            } else {
              updatedIncome = Number(
                (state.monthlyIncome + cleanTx.amount).toFixed(2)
              );
            }
          }

          const shouldSkipEvening =
            cleanTx.type === "expense" &&
            cleanTx.envelopeId === "env-resto" &&
            !state.restoSkippedDates.includes(cleanTx.date);

          const mergedTransactions = [newTx, ...filteredPrevTransactions].sort(
            (a, b) => b.date.localeCompare(a.date)
          );

          return {
            transactions: mergedTransactions,
            envelopes: updatedEnvelopes,
            monthlyIncome: updatedIncome,
            restoSkippedDates: shouldSkipEvening
              ? [...state.restoSkippedDates, cleanTx.date]
              : state.restoSkippedDates,
          };
        });
      },

      // Deleting ANY transaction (expense OR income) immediately updates envelopes OR monthlyIncome!
      deleteTransaction: (id) =>
        set((state) => {
          const target = state.transactions.find((t) => t.id === id);
          if (!target) return state;

          const updatedEnvelopes =
            target.type === "expense"
              ? state.envelopes.map((env) =>
                  env.id === target.envelopeId
                    ? {
                        ...env,
                        spent: Math.max(
                          0,
                          Number((env.spent - target.amount).toFixed(2))
                        ),
                      }
                    : env
                )
              : state.envelopes;

          const updatedIncome =
            target.type === "income"
              ? Math.max(
                  0,
                  Number((state.monthlyIncome - target.amount).toFixed(2))
                )
              : state.monthlyIncome;

          return {
            transactions: state.transactions.filter((t) => t.id !== id),
            envelopes: updatedEnvelopes,
            monthlyIncome: updatedIncome,
          };
        }),

      toggleFixedExpensePaid: (id) =>
        set((state) => ({
          fixedExpenses: state.fixedExpenses.map((f) =>
            f.id === id ? { ...f, isPaid: !f.isPaid } : f
          ),
        })),

      addFixedExpense: (expense) =>
        set((state) => ({
          fixedExpenses: [
            ...state.fixedExpenses,
            { ...expense, id: `fix-${Date.now()}` },
          ],
        })),

      updateFixedExpense: (id, updates) =>
        set((state) => ({
          fixedExpenses: state.fixedExpenses.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        })),

      deleteFixedExpense: (id) =>
        set((state) => ({
          fixedExpenses: state.fixedExpenses.filter((f) => f.id !== id),
        })),

      updateEnvelopeAllocation: (envelopeId, newAllocation) =>
        set((state) => ({
          envelopes: state.envelopes.map((e) =>
            e.id === envelopeId ? { ...e, allocated: newAllocation } : e
          ),
        })),

      updateEnvelopeSpent: (envelopeId, newSpent) =>
        set((state) => ({
          envelopes: state.envelopes.map((e) =>
            e.id === envelopeId
              ? { ...e, spent: Math.max(0, Number(newSpent.toFixed(2))) }
              : e
          ),
        })),

      addStapleToGroceries: (staple, customPrice, customQty) => {
        const price = customPrice ?? staple.defaultPrice;
        const quantity = customQty ?? staple.defaultQuantity;
        const pricePerUnit = calculateUnitPrice(price, quantity);

        const newItem: GroceryItem = {
          id: `gr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          stapleId: staple.id,
          name: staple.name,
          emoji: staple.emoji,
          family: staple.family,
          vegSubFamily: staple.vegSubFamily,
          price,
          quantity,
          unit: staple.unit,
          pricePerUnit,
          referencePricePerUnit: staple.referencePricePerUnit,
          vitamins: staple.vitamins,
          checked: false,
          purchasedAt: new Date().toISOString(),
        };

        set((state) => ({
          groceryItems: [newItem, ...state.groceryItems],
        }));
      },

      addCustomGroceryItem: (item) => {
        const pricePerUnit = calculateUnitPrice(item.price, item.quantity);
        const newItem: GroceryItem = {
          id: `gr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: item.name,
          emoji: item.emoji || "🛒",
          family: item.family,
          vegSubFamily: item.vegSubFamily,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit,
          pricePerUnit,
          referencePricePerUnit: item.referencePricePerUnit || pricePerUnit,
          vitamins: item.vitamins,
          checked: false,
          purchasedAt: new Date().toISOString(),
        };

        set((state) => ({
          groceryItems: [newItem, ...state.groceryItems],
        }));
      },

      importScannedReceipt: (items, storeLabel = "Receipt Scan") => {
        if (items.length === 0) return { totalSpent: 0, updatedCount: 0 };

        const state = get();
        const nowIso = new Date().toISOString();
        const totalSpent = Number(
          items.reduce((sum, i) => sum + i.price, 0).toFixed(2)
        );

        const newGroceryEntries: GroceryItem[] = items.map((item, idx) => {
          const unitPrice = calculateUnitPrice(item.price, item.quantity);
          return {
            id: `scan-${Date.now()}-${idx}`,
            name: item.name,
            emoji: item.emoji,
            family: item.family,
            vegSubFamily: item.vegSubFamily,
            price: item.price,
            quantity: item.quantity,
            unit: item.unit,
            pricePerUnit: unitPrice,
            referencePricePerUnit: unitPrice,
            vitamins: item.vitamins,
            checked: true,
            purchasedAt: nowIso,
          };
        });

        const updatedStaples = state.stapleProducts.map((st) => {
          const match = items.find((sc) => {
            const words = st.name
              .toLowerCase()
              .split(/\s+/)
              .filter((w) => w.length >= 4);
            return words.some((w) => sc.name.toLowerCase().includes(w));
          });
          if (!match) return st;
          const newUnitPrice = calculateUnitPrice(match.price, match.quantity);
          return {
            ...st,
            defaultPrice: match.price,
            defaultQuantity: match.quantity,
            referencePricePerUnit: newUnitPrice,
          };
        });

        state.addTransaction({
          label: `📸 ${storeLabel} (${items.length} scanned items)`,
          amount: totalSpent,
          date: nowIso.split("T")[0],
          envelopeId: "env-food",
          type: "expense",
          notes: items.map((i) => `${i.name} (${i.price}€)`).join(", "),
        });

        set((curr) => ({
          groceryItems: [...newGroceryEntries, ...curr.groceryItems],
          stapleProducts: updatedStaples,
        }));

        return { totalSpent, updatedCount: items.length };
      },

      toggleGroceryChecked: (id) =>
        set((state) => ({
          groceryItems: state.groceryItems.map((item) =>
            item.id === id ? { ...item, checked: !item.checked } : item
          ),
        })),

      removeGroceryItem: (id) =>
        set((state) => ({
          groceryItems: state.groceryItems.filter((item) => item.id !== id),
        })),

      clearCheckedGroceries: () =>
        set((state) => ({
          groceryItems: state.groceryItems.filter((item) => !item.checked),
        })),

      checkoutGroceriesToBudget: () => {
        const state = get();
        const checkedItems = state.groceryItems.filter((i) => i.checked);
        if (checkedItems.length === 0) return 0;

        const total = Number(
          checkedItems.reduce((acc, item) => acc + item.price, 0).toFixed(2)
        );

        state.addTransaction({
          label: `Grocery Basket (${checkedItems.length} items)`,
          amount: total,
          date: new Date().toISOString().split("T")[0],
          envelopeId: "env-food",
          type: "expense",
          notes: checkedItems
            .map((i) => i.name)
            .slice(0, 4)
            .join(", "),
        });

        set({
          groceryItems: state.groceryItems.filter((i) => !i.checked),
        });

        return total;
      },

      consumeBatchPortion: (id) =>
        set((state) => ({
          batchMeals: state.batchMeals.map((meal) =>
            meal.id === id && meal.remainingPortions > 0
              ? { ...meal, remainingPortions: meal.remainingPortions - 1 }
              : meal
          ),
        })),

      restockBatchMeal: (id) =>
        set((state) => ({
          batchMeals: state.batchMeals.map((meal) =>
            meal.id === id
              ? {
                  ...meal,
                  remainingPortions: meal.totalPortions,
                  isFrozen: false,
                  lastCookedAt: new Date().toISOString(),
                }
              : meal
          ),
        })),

      toggleFreezeBatchMeal: (id) =>
        set((state) => ({
          batchMeals: state.batchMeals.map((meal) =>
            meal.id === id ? { ...meal, isFrozen: !meal.isFrozen } : meal
          ),
        })),

      addBatchMeal: (meal) => {
        const costPerPortion = Number(
          (meal.totalCost / Math.max(1, meal.totalPortions)).toFixed(2)
        );
        const ingText = meal.ingredients.map((i) => i.name).join(" ");
        const detectedShelfLife =
          meal.shelfLifeDays ?? detectShelfLifeDays(meal.title, ingText).days;

        const newMeal: BatchMeal = {
          ...meal,
          id: `batch-${Date.now()}`,
          costPerPortion,
          shelfLifeDays: detectedShelfLife,
          isFrozen: false,
          lastCookedAt: new Date().toISOString(),
        };
        set((state) => ({
          batchMeals: [newMeal, ...state.batchMeals],
        }));
      },

      deleteBatchMeal: (id) =>
        set((state) => ({
          batchMeals: state.batchMeals.filter((m) => m.id !== id),
        })),

      toggleRestoDate: (dateYmd) =>
        set((state) => {
          const exists = state.restoSkippedDates.includes(dateYmd);
          return {
            restoSkippedDates: exists
              ? state.restoSkippedDates.filter((d) => d !== dateYmd)
              : [...state.restoSkippedDates, dateYmd],
          };
        }),

      resetToSeedData: () =>
        set({
          currentMonthLabel: "October 2026",
          monthlyIncome: INITIAL_MONTHLY_INCOME,
          savingsTarget: INITIAL_SAVINGS_TARGET,
          envelopes: SEED_ENVELOPES,
          fixedExpenses: SEED_FIXED_EXPENSES,
          transactions: SEED_TRANSACTIONS,
          stapleProducts: SEED_STAPLE_PRODUCTS,
          groceryItems: SEED_GROCERY_ITEMS,
          batchMeals: SEED_BATCH_MEALS,
          restoSkippedDates: [],
        }),

      importStateJson: (data) =>
        set((state) => ({
          ...state,
          currentMonthLabel: data.currentMonthLabel ?? state.currentMonthLabel,
          monthlyIncome: data.monthlyIncome ?? state.monthlyIncome,
          savingsTarget: data.savingsTarget ?? state.savingsTarget,
          envelopes: data.envelopes ?? state.envelopes,
          fixedExpenses: data.fixedExpenses ?? state.fixedExpenses,
          transactions: data.transactions ?? state.transactions,
          stapleProducts: data.stapleProducts ?? state.stapleProducts,
          groceryItems: data.groceryItems ?? state.groceryItems,
          batchMeals: data.batchMeals ?? state.batchMeals,
          restoSkippedDates:
            data.restoSkippedDates ?? state.restoSkippedDates,
        })),

      syncWithSupabase: async () => {
        const client = getSupabaseClient();
        if (!client) {
          set({ supabaseStatus: "local" });
          return {
            ok: false,
            message: "No Supabase key configured. LocalStorage mode is active.",
          };
        }

        set({ supabaseStatus: "syncing" });
        try {
          const state = get();
          const monthKey = new Date().toISOString().slice(0, 7);

          const { error } = await client.from("monthly_budgets").upsert(
            {
              month_key: monthKey,
              monthly_income: state.monthlyIncome,
              savings_target: state.savingsTarget,
              envelopes: state.envelopes,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "month_key" }
          );

          if (error) throw error;

          const now = new Date().toISOString();
          set({ supabaseStatus: "connected", lastSyncedAt: now });
          return {
            ok: true,
            message: "Supabase Cloud Sync successful.",
          };
        } catch (err) {
          set({ supabaseStatus: "error" });
          return {
            ok: false,
            message:
              err instanceof Error
                ? err.message
                : "Error syncing with Supabase.",
          };
        }
      },
    }),
    {
      name: "vital-budget-storage-v3-en",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentMonthLabel: state.currentMonthLabel,
        monthlyIncome: state.monthlyIncome,
        savingsTarget: state.savingsTarget,
        envelopes: state.envelopes,
        fixedExpenses: state.fixedExpenses,
        transactions: state.transactions,
        stapleProducts: state.stapleProducts,
        groceryItems: state.groceryItems,
        batchMeals: state.batchMeals,
        restoSkippedDates: state.restoSkippedDates,
        lastSyncedAt: state.lastSyncedAt,
        agentPersona: state.agentPersona,
        agentReply: state.agentReply,
        agentChatHistory: state.agentChatHistory,
        agentLastAction: state.agentLastAction,
        agentLastProvider: state.agentLastProvider,
        savedAgendaEvents: state.savedAgendaEvents,
      }),
    }
  )
);
