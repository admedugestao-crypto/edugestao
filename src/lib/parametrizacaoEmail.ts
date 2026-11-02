import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { z } from "zod";

export const parametrizacaoEmailSchema = z.object({
  emailHost: z.string().trim().min(1, "Informe o host SMTP.").max(253).regex(/^[a-zA-Z0-9.-]+$/, "Informe apenas o endereço do servidor SMTP."),
  emailPort: z.number().int().min(1).max(65535),
  emailUser: z.string().trim().min(1, "Informe o usuário SMTP.").max(254).regex(/^[^\r\n]+$/),
  emailPass: z.string().max(1024).optional(),
  emailFrom: z.union([z.literal(""), z.email("Informe um e-mail válido para o remetente.")]).default(""),
}).strict();

function chave(segredo: string) {
  if (!segredo) throw new Error("Segredo da plataforma não configurado.");
  return Buffer.from(hkdfSync("sha256", segredo, "eg-v2-plataforma", "smtp-v1", 32));
}

export function cifrarSenhaEmail(senha: string, segredo: string) {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chave(segredo), iv);
  const conteudo = Buffer.concat([cifra.update(senha, "utf8"), cifra.final()]);
  return ["v1", iv.toString("base64"), cifra.getAuthTag().toString("base64"), conteudo.toString("base64")].join(":");
}

export function decifrarSenhaEmail(valor: string, segredo: string) {
  const [versao, iv, tag, conteudo] = valor.split(":");
  if (versao !== "v1" || !iv || !tag || !conteudo) throw new Error("Credencial de e-mail inválida.");
  const cifra = createDecipheriv("aes-256-gcm", chave(segredo), Buffer.from(iv, "base64"));
  cifra.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([cifra.update(Buffer.from(conteudo, "base64")), cifra.final()]).toString("utf8");
}
