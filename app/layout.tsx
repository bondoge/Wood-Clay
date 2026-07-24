import type { Metadata } from "next";
import { cormorant, golosText } from "@/styles/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wood&Clay — фарфор ручной росписи",
  description:
    "Дом, который курирует и расписывает фарфор в традициях гжели, хохломы и жостова.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${cormorant.variable} ${golosText.variable} h-full antialiased`}
    >
      <body data-theme="house" className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
