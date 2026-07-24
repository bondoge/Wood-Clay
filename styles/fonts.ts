import localFont from "next/font/local";

export const cormorant = localFont({
  src: [
    {
      path: "./fonts/cormorant/cormorant-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/cormorant/cormorant-600.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-display",
  display: "swap",
});

export const golosText = localFont({
  src: [
    {
      path: "./fonts/golos-text/golos-text-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/golos-text/golos-text-600.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-body",
  display: "swap",
});
