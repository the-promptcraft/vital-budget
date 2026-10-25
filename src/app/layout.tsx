import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VitalBudget — Assistant Personnel & Budget",
  description:
    "Votre assistant financier et nutritionnel intelligent, design Apple Liquid Glass.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VitalBudget",
  },
};

export const viewport: Viewport = {
  themeColor: "#F2F4F8",
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
    <html lang="fr">
      <body className="min-h-screen bg-[#F2F4F8] text-[#1D1D1F] antialiased selection:bg-[#0071E3]/20">
        {children}
      </body>
    </html>
  );
}
