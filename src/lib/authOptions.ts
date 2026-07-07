import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    // Login normal (2 etapas na UI: empresa → email/senha) — email é único
    // por empresa, então o slug é obrigatório para desambiguar.
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        empresaSlug: { label: "Empresa", type: "text" },
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.empresaSlug || !credentials?.email || !credentials?.password) return null;

        let usuario;
        try {
          const empresa = await prisma.empresa.findUnique({ where: { slug: credentials.empresaSlug } });
          if (!empresa || !empresa.ativo) return null;

          usuario = await prisma.usuario.findUnique({
            where: { empresaId_email: { empresaId: empresa.id, email: credentials.email } },
            include: { professora: true },
          });
        } catch (e: any) {
          console.error("DB ERROR:", e.message);
          return null;
        }

        if (!usuario || !usuario.ativo || usuario.perfil === "PLATAFORMA") return null;

        const senhaCorreta = await bcrypt.compare(credentials.password, usuario.senhaHash);
        if (!senhaCorreta) return null;

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          professoraId: usuario.professora?.id ?? null,
          empresaId: usuario.empresaId,
        } as any;
      },
    }),
    // Login separado da plataforma (uso interno) — sem etapa de empresa,
    // usuário PLATAFORMA sempre tem empresaId nulo.
    CredentialsProvider({
      id: "credentials-plataforma",
      name: "credentials-plataforma",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let usuario;
        try {
          usuario = await prisma.usuario.findFirst({
            where: { email: credentials.email, empresaId: null, perfil: "PLATAFORMA" },
          });
        } catch (e: any) {
          console.error("DB ERROR:", e.message);
          return null;
        }

        if (!usuario || !usuario.ativo) return null;

        const senhaCorreta = await bcrypt.compare(credentials.password, usuario.senhaHash);
        if (!senhaCorreta) return null;

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          professoraId: null,
          empresaId: null,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.perfil = (user as any).perfil;
        token.professoraId = (user as any).professoraId;
        token.empresaId = (user as any).empresaId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).perfil = token.perfil;
        (session.user as any).professoraId = token.professoraId;
        (session.user as any).empresaId = token.empresaId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
