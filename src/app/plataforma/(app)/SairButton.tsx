"use client";

import { signOut } from "next-auth/react";

export default function SairButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/plataforma/login" })}
      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-800 transition-colors"
    >
      Sair
    </button>
  );
}
