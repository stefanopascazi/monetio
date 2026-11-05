import type { Metadata, Viewport } from "next";
import { Gabarito, JetBrains_Mono, Onest } from "next/font/google";
import { themeInitScript } from "@monetio/ui";
import "./globals.css";

const display = Gabarito({ variable: "--font-gabarito", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const sans = Onest({ variable: "--font-onest", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "MonetIO",
  description: "Household finances, shared.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f0e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // No default data-theme: the OS decides unless the user picked Light or Dark (applied by the init script).
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="mio-root min-h-full">{children}</body>
    </html>
  );
}
