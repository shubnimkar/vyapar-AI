import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import PWAUpdateNotification from "@/components/PWAUpdateNotification";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { PWAServiceWorkerRegistration } from "@/components/PWAServiceWorkerRegistration";
import { ToastProvider } from "@/components/ui/Toast";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Vyapar AI - Smart Business Assistant",
  description: "AI-powered financial health tracking for small businesses. Track daily entries, manage credit, and get personalized insights.",
  // Point metadata to the generated web manifest used for PWA install
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vyapar AI",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Vyapar AI",
    title: "Vyapar AI - Smart Business Assistant",
    description: "AI-powered financial health tracking for small businesses",
  },
  twitter: {
    card: "summary",
    title: "Vyapar AI - Smart Business Assistant",
    description: "AI-powered financial health tracking for small businesses",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#0b1a7d" />
        <link rel="icon" href="/favicon.ico" />
        {/* Material Symbols Outlined font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" />
        {/* Explicit manifest link so Chrome can detect the PWA manifest */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png?v=1.1.0" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          {children}
          <PWAServiceWorkerRegistration />
          <PWAUpdateNotification />
          <PWAInstallPrompt />
        </ToastProvider>
      </body>
    </html>
  );
}
