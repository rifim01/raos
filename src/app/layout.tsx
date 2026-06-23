import type { Metadata, Viewport } from "next";
import "./globals.css";
import FloatingCommandCenter from "@/components/FloatingCommandCenter";
import AppBackground from "@/components/layout/AppBackground";

export const metadata: Metadata = {
  title: "RAOS - RIFIM Airport Operating System",
  description: "One Platform. All Airports. Full Control.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RAOS",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#E53935",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RAOS" />
      </head>
      <body className="h-full">
        {/* Branding background layer — fixed, behind all content, excludes auth routes */}
        <AppBackground />
        {/* z-index 1 ensures app shell renders above the background */}
        <div className="relative h-full" style={{ zIndex: 1 }}>
          {children}
        </div>
        <FloatingCommandCenter />
      </body>
    </html>
  );
}
