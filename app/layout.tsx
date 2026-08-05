import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wood&Clay — фарфоровые изделия ручной работы",
  description:
    "Фарфоровые ёлочные игрушки, фигурки и корпоративные подарки, расписанные вручную.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
