import { z } from "zod";

export const VERSAO_CONSENTIMENTO = "teste-eg-v2-2026-10";
export const CONFIRMACAO_INSCRICAO = "Recebemos sua inscrição! Nossa equipe entrará em contato com todos os inscritos pelo WhatsApp informado. Os 5 professores selecionados receberão a confirmação de participação e as instruções para testar o EG V2 gratuitamente por 60 dias, além de 12 meses gratuitos contados a partir do lançamento oficial.";

export function normalizarWhatsapp(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length === 13 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
}

export const inscricaoTesteSchema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo.").max(120),
  email: z.string().trim().email("Informe um e-mail válido.").max(180).transform((v) => v.toLowerCase()),
  whatsapp: z.string().max(30).transform(normalizarWhatsapp).pipe(
    z.string().regex(/^[1-9]{2}9\d{8}$/, "Informe um celular com DDD, por exemplo (31) 99999-9999.")
  ),
  materias: z.string().trim().min(2, "Informe as matérias ou áreas em que atua.").max(200),
  quantidadeAlunos: z.number().int().min(0).max(10000),
  organizacao: z.string().trim().min(3, "Conte como organiza suas aulas hoje.").max(600),
  dificuldade: z.string().trim().min(5, "Conte sua principal dificuldade.").max(1000),
  disponibilidade: z.boolean(),
  consentimento: z.literal(true, { error: "Autorize o contato pelo WhatsApp para se inscrever." }),
  site: z.string().max(200).optional(),
});
