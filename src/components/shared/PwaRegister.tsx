```typescript
"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Mendaftarkan service worker bawaan next-pWA secara aman di client-side browser
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("RAOS PWA Service Worker Berhasil Terdaftar:", reg.scope))
        .catch((err) => console.error("Registrasi PWA Service Worker Gagal:", err));
    }
  }, []);

  return null; // Komponen background pasif, tidak merender elemen visual apa pun
}
