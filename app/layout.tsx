import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Нам доверяют — Wood&Clay",
  description:
    "Отзывы покупателей о фарфоровых игрушках и фигурках ручной работы Wood&Clay.",
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
