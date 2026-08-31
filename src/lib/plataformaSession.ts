import { cache } from "react";
import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";
import { PLATAFORMA_COOKIE } from "@/lib/plataformaCookie";

export type PlataformaToken = {
  id: string;
  name: string;
  email: string;
  perfil: "PLATAFORMA";
};

export const plataformaAuth = cache(async (): Promise<{ user: PlataformaToken } | null> => {
  const secret = process.env.NEXTAUTH_SECRET;
  const tokenBruto = (await cookies()).get(PLATAFORMA_COOKIE)?.value;
  if (!secret || !tokenBruto) return null;

  const token = await decode({ token: tokenBruto, secret }).catch(() => null);
  if (token?.perfil !== "PLATAFORMA" || typeof token.id !== "string") return null;

  return {
    user: {
      id: token.id,
      name: typeof token.name === "string" ? token.name : "Plataforma",
      email: typeof token.email === "string" ? token.email : "",
      perfil: "PLATAFORMA",
    },
  };
});
