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
      <div className="min-h-screen bg-[#F2F4F8] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#0071E3]/25 border-t-[#0071E3] animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#F2F4F8] text-[#1D1D1F] flex flex-col overflow-x-hidden">
      {/* Apple Liquid Glass Ambient Pastel Mesh Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-[#0071E3]/12 blur-3xl" />
        <div className="absolute top-28 -right-24 w-80 h-80 rounded-full bg-[#34C759]/12 blur-3xl" />
        <div className="absolute bottom-24 left-1/4 w-96 h-96 rounded-full bg-[#AF52DE]/10 blur-3xl" />
      </div>

      <Header />

      <main className="relative z-10 flex-1 w-full max-w-lg mx-auto px-4 pt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 32,
              mass: 0.8,
            }}
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
