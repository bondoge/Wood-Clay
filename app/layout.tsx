import type { Metadata } from "next";
import "./globals.css";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { YandexMetrika } from "@/components/analytics/YandexMetrika";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";

export const metadata: Metadata = {
  title: "Wood&Clay — фарфоровые изделия ручной работы",
  description:
    "Фарфоровые ёлочные игрушки, фигурки и корпоративные подарки, расписанные вручную.",
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
