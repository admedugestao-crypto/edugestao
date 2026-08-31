"use client";

import { useRouter } from "next/navigation";

export default function SairButton() {
  const router = useRouter();

  async function sair() {
    await fetch("/api/plataforma/sessao", { method: "DELETE" });
    router.push("/plataforma/login");
    router.refresh();
  }

  return (
    <button
      onClick={sair}
      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-800 transition-colors"
    >
      Sair
    </button>
  );
}
