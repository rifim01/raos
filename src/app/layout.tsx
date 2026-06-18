import type { Metadata, Viewport } from "next";
import "./globals.css";
// 1. SILAKAN CEK: Baris impor baru untuk memanggil komponen melayang global
import FloatingCommandCenter from "@/components/FloatingCommandCenter";

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
        {/* Seluruh halaman dan tab dashboard utama di-render di sini */}
        {children}
        
        {/* 2. SILAKAN CEK: Diselipkan di sini agar otomatis melayang di setiap tab halaman */}
        <FloatingCommandCenter />
      </body>
    </html>
  );
}
