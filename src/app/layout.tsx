import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://testing-app.cesargonzalezzapata.workers.dev";
const SITE_NAME = "Jornada40";
const TAGLINE = "Cumple la jornada de 40 horas sin cambiar contratos";
const DESCRIPTION =
  "Jornada40 reacomoda los turnos de tu sucursal con los mismos contratos, te dice cuántas horas dejan de pagarse al doble y cumple la reforma laboral de 2026 a 2030.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · ${TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "jornada de 40 horas",
    "reforma laboral",
    "turnos",
    "horas extra",
    "nómina",
    "sucursales",
    "México",
    "AIvena",
  ],
  authors: [{ name: "AIvena Inc.", url: "https://aivena.ai" }],
  creator: "AIvena Inc.",
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} · ${TAGLINE}`,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · ${TAGLINE}`,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
