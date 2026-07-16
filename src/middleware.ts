import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = [
    "/login", "/plataforma/login",
    "/esqueci-senha", "/api/esqueci-senha",
    "/redefinir-senha", "/api/redefinir-senha",
    "/api/auth",
    "/api/cron",
  ];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isPlataforma = pathname.startsWith("/plataforma") || pathname.startsWith("/api/plataforma");

  if (!token) {
    const loginUrl = new URL(isPlataforma ? "/plataforma/login" : "/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Área da plataforma é exclusiva do papel PLATAFORMA; o inverso também
  // vale — um usuário PLATAFORMA (sem empresaId) não acessa telas operacionais.
  if (isPlataforma && token.perfil !== "PLATAFORMA") {
    return NextResponse.redirect(new URL("/plataforma/login", request.url));
  }
  if (!isPlataforma && token.perfil === "PLATAFORMA") {
    return NextResponse.redirect(new URL("/plataforma", request.url));
  }

  // Senha temporária (criada pela plataforma) — obriga trocar antes de
  // acessar qualquer outra tela, exceto a própria página/rota de troca.
  const isTrocarSenha = pathname.startsWith("/trocar-senha") || pathname.startsWith("/api/trocar-senha");
  if (token.senhaTemporaria && !isTrocarSenha) {
    return NextResponse.redirect(new URL("/trocar-senha", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
