import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kora — Wealth & Nutrition Intelligence",
  description:
    "Votre argent. Votre assiette. Pilotés en temps réel par Kora Flow & Kora Chef.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kora",
  },
};

export const viewport: Viewport = {
  themeColor: "#EEF1F7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#EEF1F7] text-[#0F172A] antialiased selection:bg-[#0071E3]/20">
        {children}
      </body>
    </html>
  );
}
