/**
 * ClearSign v1.0 — Root Layout
 *
 * Phase 1.2 — Root layout with:
 * - Inter font (UI) via next/font/google
 * - Geist Mono (code/IDs) via next/font/local (self-hosted, per UX Brief §4.1)
 * - <html lang="en"> and mobile viewport meta
 * - SEO meta tags
 */

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import FooterSection from "@/components/ui/footer";

import Background from "@/components/ui/demo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ClearSign — Understand Before You Sign",
  description:
    "AI-powered document analysis that breaks down legal documents into plain-language explanations. Upload a PDF or DOCX and understand every clause in seconds.",
  keywords: [
    "legal document analysis",
    "contract review",
    "AI document reader",
    "plain language",
    "clause breakdown",
  ],
  authors: [{ name: "ClearSign" }],
  openGraph: {
    title: "ClearSign — Understand Before You Sign",
    description:
      "Upload any legal document and get a plain-language breakdown of every clause. No sign-up required.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <Background>
          {children}
          <FooterSection />
        </Background>
      </body>
    </html>
  );
}
