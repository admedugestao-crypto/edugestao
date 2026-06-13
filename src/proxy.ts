import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = ["/login", "/cadastro", "/api/auth", "/api/cadastro"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const cookieNames = [...request.cookies.getAll().map((c) => c.name)];
  const hasSessionCookie = cookieNames.some((n) =>
    n.includes("session-token")
  );
  console.log(
    "[proxy] pathname:",
    pathname,
    "cookies:",
    cookieNames.join(","),
    "hasSession:",
    hasSessionCookie,
    "secret_set:",
    !!process.env.NEXTAUTH_SECRET
  );

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  console.log("[proxy] token:", token ? "FOUND" : "NULL");

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
