"use client";

import React, { useSyncExternalStore } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Header } from "@/components/layout/Header";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { QuickAddModal } from "@/components/layout/QuickAddModal";
import { StocksDashboard } from "@/components/dashboard/StocksDashboard";
import { GroceriesView } from "@/components/groceries/GroceriesView";
import { BatchCookingView } from "@/components/batch/BatchCookingView";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { motion, AnimatePresence } from "framer-motion";

const emptySubscribe = () => () => {};

export default function HomePage() {
  const { activeTab } = useFinanceStore();
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#121214] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1C1C1E] border border-white/[0.12] flex items-center justify-center animate-pulse">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-6 h-6"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 17L9 11L13 15L21 7"
                stroke="#30D158"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 7H21V12"
                stroke="#0A84FF"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-xs font-mono text-zinc-400 tracking-wider">
            LOADING VITALBUDGET...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121214] text-white flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {activeTab === "stocks" && <StocksDashboard />}
            {activeTab === "groceries" && <GroceriesView />}
            {activeTab === "batch" && <BatchCookingView />}
            {activeTab === "analytics" && <AnalyticsView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <QuickAddModal />
      <BottomTabBar />
    </div>
  );
}
