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
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col overflow-x-hidden">
      {/* Vercel-style subtle ambient top radial spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_70%_50%_at_50%_-15%,rgba(255,255,255,0.09),transparent)] z-0"
      />

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
