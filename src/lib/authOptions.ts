import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    // Login normal (só e-mail/senha) — a empresa não é mais escolhida no
    // login, ela já vem do vínculo definido no cadastro do usuário (feito
    // na plataforma). E-mail continua único por empresa no banco, mas como
    // hoje cada pessoa pertence a uma única empresa, buscamos pelo primeiro
    // usuário operacional (não-PLATAFORMA) com esse e-mail.
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let usuario;
        try {
          usuario = await prisma.usuario.findFirst({
            where: { email: credentials.email, perfil: { not: "PLATAFORMA" } },
            include: { professora: true, empresa: true },
          });
        } catch (e: any) {
          console.error("DB ERROR:", e.message);
          return null;
        }

        if (!usuario || !usuario.ativo || !usuario.empresa?.ativo) return null;

        const senhaCorreta = await bcrypt.compare(credentials.password, usuario.senhaHash);
        if (!senhaCorreta) return null;

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          professoraId: usuario.professora?.id ?? null,
          empresaId: usuario.empresaId,
          senhaTemporaria: usuario.senhaTemporaria,
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
        token.senhaTemporaria = (user as any).senhaTemporaria ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).perfil = token.perfil;
        (session.user as any).professoraId = token.professoraId;
        (session.user as any).empresaId = token.empresaId;
        (session.user as any).senhaTemporaria = token.senhaTemporaria ?? false;
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
