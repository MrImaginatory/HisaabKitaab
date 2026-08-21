import type { Metadata } from "next";
import { Inter, JetBrains_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// BinanceNova substitute -> Inter (closest open-source per DESIGN-binance.md:432)
// BinancePlex substitute -> JetBrains Mono (tabular numbers) + IBM Plex Sans fallback
const binanceNova = Inter({
  variable: "--font-binance-nova",
  subsets: ["latin"],
  display: "swap",
});

const binancePlex = JetBrains_Mono({
  variable: "--font-binance-plex",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hisaab Kitaab — Local-First Ledger",
  description:
    "100% local SQLite hisaab kitaab. No server, no sync, no data leaves your device. Binance-dark financial precision meets khata simplicity.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${binanceNova.variable} ${binancePlex.variable} ${ibmPlexSans.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[var(--color-canvas-dark)] text-[var(--color-body)] selection:bg-[var(--color-primary)] selection:text-[var(--color-on-primary)]">
        {children}
      </body>
    </html>
  );
}
