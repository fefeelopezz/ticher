import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE = "https://www.ticher.pro";
const DESCRIPTION =
  "Ticher es tu tutor de IA para estudiar: resuelve dudas paso a paso, convierte tus apuntes en resúmenes, tarjetas y cuestionarios, y te prepara para cada examen con un plan y simulacros.";

// The share image (opengraph-image.png / twitter-image.png) and icons come from files in app/.
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Ticher · Tu tutor de IA para estudiar y preparar exámenes", template: "%s · Ticher" },
  description: DESCRIPTION,
  applicationName: "Ticher",
  keywords: ["tutor de IA", "estudiar con IA", "preparar exámenes", "tarjetas de memoria", "cuestionarios", "resúmenes", "repaso espaciado", "Ticher"],
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Ticher",
    locale: "es_ES",
    title: "Ticher · Tu tutor de IA para estudiar y preparar exámenes",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: "Ticher · Tu tutor de IA para estudiar", description: DESCRIPTION },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

// Structured data so search engines know Ticher is a web app for studying.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Ticher",
  url: SITE,
  description: DESCRIPTION,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  inLanguage: "es",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
