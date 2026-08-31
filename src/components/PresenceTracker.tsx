"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const CHAVE_SESSAO = "edugestao-presenca-id";

function identificarDispositivo() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone/iPad";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Navegador";
}

function obterSessaoId() {
  let id = sessionStorage.getItem(CHAVE_SESSAO);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(CHAVE_SESSAO, id);
  }
  return id;
}

export default function PresenceTracker() {
  const pathname = usePathname();

  useEffect(() => {
    let ativo = true;
    async function registrar() {
      if (!ativo || document.visibilityState === "hidden") return;
      await fetch("/api/presenca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessaoId: obterSessaoId(), rota: pathname, dispositivo: identificarDispositivo() }),
        keepalive: true,
      }).catch(() => undefined);
    }

    void registrar();
    const intervalo = window.setInterval(registrar, 30_000);
    const aoVoltar = () => void registrar();
    window.addEventListener("focus", aoVoltar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
      window.removeEventListener("focus", aoVoltar);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [pathname]);

  return null;
}
