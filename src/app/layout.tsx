import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VitalBudget — Stock-Style Personal Finance & Batch Cooking",
  description:
    "Mobile-First PWA: Track your Disposable Income like a stock portfolio, optimize grocery unit prices (€/kg), and plan nutrient-dense Batch Cooking with automatic Use-By Dates.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VitalBudget",
  },
};

export const viewport: Viewport = {
  themeColor: "#121214",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#121214] text-[#F5F5F7] antialiased selection:bg-[#0A84FF]/30">
        {children}
      </body>
    </html>
  );
}
