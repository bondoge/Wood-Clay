import type { Metadata } from "next";
import "./globals.css";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { YandexMetrika } from "@/components/analytics/YandexMetrika";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";

export const metadata: Metadata = {
  // Rewritten for commercial intent (Task 2) — the previous title carried no
  // searchable query at all. Formula: {primary commercial phrase} — Wood&Clay.
  title: "Фарфоровые ёлочные игрушки и статуэтки — Wood&Clay",
  description:
    "Фарфоровые ёлочные игрушки, статуэтки гжель и хохлома ручной работы. Новогодние подарки, собственная мастерская, доставка по России.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "48x48" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <OrganizationJsonLd />
        {children}
        <ConsentBanner />
        <YandexMetrika />
      </body>
    </html>
  );
}
