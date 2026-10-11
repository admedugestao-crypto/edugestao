"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { moduloDaRota } from "@/lib/modulosAcesso";

export default function RegistrarAcesso() {
  const pathname = usePathname();
  const ultimaRota = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname || !moduloDaRota(pathname) || ultimaRota.current === pathname) return;
    ultimaRota.current = pathname;
    void fetch("/api/acessos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rota: pathname, eventoId: crypto.randomUUID(),
        canal: /^\/m(\/|$)/.test(pathname) || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "MOBILE" : "WEB" }),
      keepalive: true,
    }).catch(() => { /* A coleta não interrompe o uso do aplicativo. */ });
  }, [pathname]);
  return null;
}
