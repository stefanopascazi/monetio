import type { Metadata, Viewport } from "next";
import { Gabarito, JetBrains_Mono, Onest } from "next/font/google";
import { ToastProvider, themeInitScript } from "@monetio/ui";
import { ServiceWorker } from "@/components/shell/ServiceWorker";
import "./globals.css";

const display = Gabarito({ variable: "--font-gabarito", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const sans = Onest({ variable: "--font-onest", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "MonetIO", template: "%s · MonetIO" },
  description: "Le finanze di famiglia, condivise.",
  applicationName: "MonetIO",
  appleWebApp: { capable: true, title: "MonetIO", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
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
    <html lang="it" className={`${display.variable} ${sans.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="mio-root min-h-full">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
