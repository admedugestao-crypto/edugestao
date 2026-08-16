import nodemailer from "nodemailer";
import { limparEnv } from "./envUtil";

// ── Credenciais de SMTP de UMA empresa (cada empresa tem sua própria conta —
// sem fallback pra variável de ambiente global, mesmo padrão do WhatsApp). ──
export type EmailCredenciais = {
  emailHost?: string | null;
  emailPort?: string | null;
  emailUser?: string | null;
  emailPass?: string | null;
  emailFrom?: string | null;
};

// ── Transportador SMTP ────────────────────────────────────────────────────────
function criarTransporte(credenciais: EmailCredenciais) {
  const host = limparEnv(credenciais.emailHost);
  const user = limparEnv(credenciais.emailUser);
  const pass = limparEnv(credenciais.emailPass);
  if (!host || !user || !pass) return null;

  const porta = parseInt(limparEnv(credenciais.emailPort) ?? "587");
  return nodemailer.createTransport({
    host,
    port: porta,
    secure: porta === 465,
    auth: { user, pass },
  });
}

export function emailConfigurado(credenciais: EmailCredenciais) {
  return !!(limparEnv(credenciais.emailHost) && limparEnv(credenciais.emailUser) && limparEnv(credenciais.emailPass));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Template HTML ─────────────────────────────────────────────────────────────
const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const TIPO_LABEL: Record<string, string> = {
  MENSAL: "Mensal", QUINZENAL: "Quinzenal", SEMANAL: "Semanal", POR_AULA: "Por aula",
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function templateAtraso(params: {
  nomeResponsavel: string;
  nomeAluno: string;
  tipoCobranca: string;
  valorCobrado: number;
  dataVencimento: Date;
  mes: number;
  ano: number;
  nomeProfessora: string;
  parcela?: number;
}) {
  const {
    nomeResponsavel, nomeAluno, tipoCobranca, valorCobrado,
    dataVencimento, mes, ano, nomeProfessora, parcela,
  } = params;

  const dataFmt = dataVencimento.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const mesFmt = `${MESES[mes - 1]} de ${ano}`;
  const tipoFmt = TIPO_LABEL[tipoCobranca] ?? tipoCobranca;
  const parcelaFmt = parcela && parcela > 1 ? ` — Parcela ${parcela}` : "";

  return {
    subject: `⚠️ Pagamento em atraso — ${nomeAluno} · ${mesFmt}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Cabeçalho -->
        <tr>
          <td style="background:#111827;padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px;">▲ EduGestão</p>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Gestão Educacional</p>
          </td>
        </tr>

        <!-- Alerta -->
        <tr>
          <td style="background:#fef2f2;border-bottom:3px solid #fca5a5;padding:16px 32px;">
            <p style="margin:0;color:#dc2626;font-size:15px;font-weight:bold;">
              ⚠️ Aviso de pagamento em atraso
            </p>
          </td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              Prezado(a) <strong>${nomeResponsavel}</strong>,
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
              Identificamos que o pagamento referente às aulas do(a) aluno(a)
              <strong>${nomeAluno}</strong> encontra-se em atraso.
              Por gentileza, regularize assim que possível.
            </p>

            <!-- Card detalhes -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <table width="100%" cellpadding="6" cellspacing="0">
                    <tr>
                      <td style="color:#6b7280;font-size:13px;width:45%;">Aluno(a)</td>
                      <td style="color:#111827;font-size:13px;font-weight:bold;">${nomeAluno}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Tipo de cobrança</td>
                      <td style="color:#111827;font-size:13px;">${tipoFmt}${parcelaFmt}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Mês de referência</td>
                      <td style="color:#111827;font-size:13px;">${mesFmt}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Vencimento</td>
                      <td style="color:#dc2626;font-size:13px;font-weight:bold;">${dataFmt}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Valor em atraso</td>
                      <td style="color:#dc2626;font-size:16px;font-weight:bold;">${moeda(valorCobrado)}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Professor(a)</td>
                      <td style="color:#111827;font-size:13px;">${nomeProfessora}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">
              Em caso de dúvidas, entre em contato diretamente com o(a) professor(a) responsável.
            </p>
            <p style="margin:0;color:#374151;font-size:14px;">
              Agradecemos a compreensão. 🙏
            </p>
          </td>
        </tr>

        <!-- Rodapé -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Mensagem automática enviada pelo <strong>EduGestão</strong>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

// ── Template HTML — Lembrete de Vencimento ───────────────────────────────────
function templateLembrete(params: {
  nomeResponsavel: string;
  nomeAluno: string;
  tipoCobranca: string;
  valorCobrado: number;
  dataVencimento: Date;
  mes: number;
  ano: number;
  nomeProfessora: string;
  parcela?: number;
}) {
  const {
    nomeResponsavel, nomeAluno, tipoCobranca, valorCobrado,
    dataVencimento, mes, ano, nomeProfessora, parcela,
  } = params;

  const dataFmt  = dataVencimento.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const mesFmt   = `${MESES[mes - 1]} de ${ano}`;
  const tipoFmt  = TIPO_LABEL[tipoCobranca] ?? tipoCobranca;
  const parcelaFmt = parcela && parcela > 1 ? ` — Parcela ${parcela}` : "";

  return {
    subject: `📅 Lembrete de vencimento — ${nomeAluno} · ${mesFmt}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#111827;padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px;">▲ EduGestão</p>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Gestão Educacional</p>
          </td>
        </tr>
        <tr>
          <td style="background:#eff6ff;border-bottom:3px solid #93c5fd;padding:16px 32px;">
            <p style="margin:0;color:#1d4ed8;font-size:15px;font-weight:bold;">
              📅 Lembrete de pagamento próximo ao vencimento
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              Prezado(a) <strong>${nomeResponsavel}</strong>,
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
              Este é um lembrete de que o pagamento referente às aulas do(a) aluno(a)
              <strong>${nomeAluno}</strong> está próximo do vencimento.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <table width="100%" cellpadding="6" cellspacing="0">
                    <tr>
                      <td style="color:#6b7280;font-size:13px;width:45%;">Aluno(a)</td>
                      <td style="color:#111827;font-size:13px;font-weight:bold;">${nomeAluno}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Tipo de cobrança</td>
                      <td style="color:#111827;font-size:13px;">${tipoFmt}${parcelaFmt}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Mês de referência</td>
                      <td style="color:#111827;font-size:13px;">${mesFmt}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Vencimento</td>
                      <td style="color:#1d4ed8;font-size:13px;font-weight:bold;">${dataFmt}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Valor</td>
                      <td style="color:#111827;font-size:16px;font-weight:bold;">${moeda(valorCobrado)}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Professor(a)</td>
                      <td style="color:#111827;font-size:13px;">${nomeProfessora}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">
              Em caso de dúvidas, entre em contato com o(a) professor(a) responsável.
            </p>
            <p style="margin:0;color:#374151;font-size:14px;">Obrigado! 😊</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Mensagem automática enviada pelo <strong>EduGestão</strong>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

// ── Template HTML — Confirmação de Pagamento ──────────────────────────────────
function templateRecibo(params: {
  nomeResponsavel: string;
  nomeAluno: string;
  tipoCobranca: string;
  valorCobrado: number;
  dataPagamento: Date;
  mes: number;
  ano: number;
  nomeProfessora: string;
  parcela?: number;
}) {
  const {
    nomeResponsavel, nomeAluno, tipoCobranca, valorCobrado,
    dataPagamento, mes, ano, nomeProfessora, parcela,
  } = params;

  const dataFmt  = dataPagamento.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const mesFmt   = `${MESES[mes - 1]} de ${ano}`;
  const tipoFmt  = TIPO_LABEL[tipoCobranca] ?? tipoCobranca;
  const parcelaFmt = parcela && parcela > 1 ? ` — Parcela ${parcela}` : "";

  return {
    subject: `✅ Pagamento confirmado — ${nomeAluno} · ${mesFmt}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#111827;padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px;">▲ EduGestão</p>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Gestão Educacional</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f0fdf4;border-bottom:3px solid #86efac;padding:16px 32px;">
            <p style="margin:0;color:#15803d;font-size:15px;font-weight:bold;">
              ✅ Pagamento recebido com sucesso!
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              Prezado(a) <strong>${nomeResponsavel}</strong>,
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
              Confirmamos o recebimento do pagamento referente às aulas do(a) aluno(a)
              <strong>${nomeAluno}</strong>. Segue o comprovante abaixo.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <table width="100%" cellpadding="6" cellspacing="0">
                    <tr>
                      <td style="color:#6b7280;font-size:13px;width:45%;">Aluno(a)</td>
                      <td style="color:#111827;font-size:13px;font-weight:bold;">${nomeAluno}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Tipo de cobrança</td>
                      <td style="color:#111827;font-size:13px;">${tipoFmt}${parcelaFmt}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Mês de referência</td>
                      <td style="color:#111827;font-size:13px;">${mesFmt}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Data do pagamento</td>
                      <td style="color:#15803d;font-size:13px;font-weight:bold;">${dataFmt}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Valor pago</td>
                      <td style="color:#15803d;font-size:16px;font-weight:bold;">${moeda(valorCobrado)}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Professor(a)</td>
                      <td style="color:#111827;font-size:13px;">${nomeProfessora}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#374151;font-size:14px;">
              Agradecemos a pontualidade! 🙏
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Mensagem automática enviada pelo <strong>EduGestão</strong>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export async function enviarEmailLembrete(params: Parameters<typeof templateLembrete>[0] & {
  emailResponsavel: string;
}, credenciais: EmailCredenciais): Promise<{ ok: boolean; erro?: string }> {
  const transporte = criarTransporte(credenciais);
  if (!transporte) return { ok: false, erro: "E-mail não configurado." };
  const { subject, html } = templateLembrete(params);
  const from = limparEnv(credenciais.emailFrom) ?? limparEnv(credenciais.emailUser) ?? "EduGestão";
  try {
    await transporte.sendMail({ from, to: params.emailResponsavel, subject, html });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, erro: err?.message ?? "Erro ao enviar e-mail." };
  }
}

export async function enviarEmailRecibo(params: Parameters<typeof templateRecibo>[0] & {
  emailResponsavel: string;
}, credenciais: EmailCredenciais): Promise<{ ok: boolean; erro?: string }> {
  const transporte = criarTransporte(credenciais);
  if (!transporte) return { ok: false, erro: "E-mail não configurado." };
  const { subject, html } = templateRecibo(params);
  const from = limparEnv(credenciais.emailFrom) ?? limparEnv(credenciais.emailUser) ?? "EduGestão";
  try {
    await transporte.sendMail({ from, to: params.emailResponsavel, subject, html });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, erro: err?.message ?? "Erro ao enviar e-mail." };
  }
}

// ── Template HTML — Cronograma de Prova ──────────────────────────────────────
function templateProva(params: {
  nomeProfessor: string;
  nomeAvaliacao: string;
  nomeMateria: string | null;
  nomeEscola: string;
  nomeUnidade: string;
  serie: string;
  dataProva: Date;
  diasRestantes: number;
  nomesAlunos: string[];
  observacao?: string | null;
}) {
  const {
    nomeProfessor, nomeAvaliacao, nomeMateria, nomeEscola,
    nomeUnidade, serie, dataProva, diasRestantes, nomesAlunos, observacao,
  } = params;

  const dataFmt = dataProva.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const avisoTexto =
    diasRestantes === 0
      ? "🔔 A prova é <strong>HOJE</strong>!"
      : diasRestantes === 1
      ? "⚠️ A prova é <strong>amanhã</strong>!"
      : `📅 Faltam <strong>${diasRestantes} dias</strong> para a prova.`;

  const corAviso  = diasRestantes === 0 ? "#dc2626" : diasRestantes <= 1 ? "#d97706" : "#2563eb";
  const bgAviso   = diasRestantes === 0 ? "#fef2f2" : diasRestantes <= 1 ? "#fffbeb" : "#eff6ff";
  const bordaAviso = diasRestantes === 0 ? "#fca5a5" : diasRestantes <= 1 ? "#fcd34d" : "#93c5fd";

  const alunosHtml = nomesAlunos.length > 0
    ? nomesAlunos.map((n) => `<li style="margin:3px 0;color:#374151;font-size:13px;">${n}</li>`).join("")
    : `<li style="color:#9ca3af;font-size:13px;">Nenhum aluno encontrado</li>`;

  const subject =
    diasRestantes === 0
      ? `🔔 Prova HOJE — ${nomeAvaliacao}${nomeMateria ? ` · ${nomeMateria}` : ""}`
      : diasRestantes === 1
      ? `⚠️ Prova amanhã — ${nomeAvaliacao}${nomeMateria ? ` · ${nomeMateria}` : ""}`
      : `📅 Prova em ${diasRestantes} dias — ${nomeAvaliacao}${nomeMateria ? ` · ${nomeMateria}` : ""}`;

  return {
    subject,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Cabeçalho -->
        <tr>
          <td style="background:#111827;padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px;">▲ EduGestão</p>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Gestão Educacional</p>
          </td>
        </tr>

        <!-- Alerta de prazo -->
        <tr>
          <td style="background:${bgAviso};border-bottom:3px solid ${bordaAviso};padding:16px 32px;">
            <p style="margin:0;color:${corAviso};font-size:15px;font-weight:bold;">
              ${avisoTexto}
            </p>
          </td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              Olá, prof. <strong>${nomeProfessor}</strong>!
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
              Segue o lembrete de avaliação agendada para os seus alunos.
            </p>

            <!-- Card detalhes da prova -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <table width="100%" cellpadding="6" cellspacing="0">
                    <tr>
                      <td style="color:#6b7280;font-size:13px;width:40%;">Avaliação</td>
                      <td style="color:#111827;font-size:13px;font-weight:bold;">${nomeAvaliacao}</td>
                    </tr>
                    ${nomeMateria ? `<tr>
                      <td style="color:#6b7280;font-size:13px;">Disciplina</td>
                      <td style="color:#111827;font-size:13px;">${nomeMateria}</td>
                    </tr>` : ""}
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Escola</td>
                      <td style="color:#111827;font-size:13px;">${nomeEscola}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Unidade</td>
                      <td style="color:#111827;font-size:13px;">${nomeUnidade}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Série</td>
                      <td style="color:#111827;font-size:13px;">${serie}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;">Data</td>
                      <td style="color:${corAviso};font-size:13px;font-weight:bold;">${dataFmt}</td>
                    </tr>
                    ${observacao ? `<tr>
                      <td style="color:#6b7280;font-size:13px;">Observação</td>
                      <td style="color:#111827;font-size:13px;">${escapeHtml(observacao).replace(/\n/g, "<br>")}</td>
                    </tr>` : ""}
                  </table>
                </td>
              </tr>
            </table>

            <!-- Lista de alunos -->
            <p style="margin:0 0 8px;color:#374151;font-size:13px;font-weight:bold;">
              👥 Seus alunos nesta turma (${nomesAlunos.length}):
            </p>
            <ul style="margin:0 0 24px;padding-left:20px;">
              ${alunosHtml}
            </ul>

            <p style="margin:0;color:#374151;font-size:14px;">Bons estudos! 📚</p>
          </td>
        </tr>

        <!-- Rodapé -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Mensagem automática enviada pelo <strong>EduGestão</strong>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export async function enviarEmailProva(
  params: Parameters<typeof templateProva>[0] & { emailProfessor: string },
  credenciais: EmailCredenciais,
): Promise<{ ok: boolean; erro?: string }> {
  const transporte = criarTransporte(credenciais);
  if (!transporte) return { ok: false, erro: "E-mail não configurado." };

  const { subject, html } = templateProva(params);
  const from = limparEnv(credenciais.emailFrom) ?? limparEnv(credenciais.emailUser) ?? "EduGestão";

  try {
    await transporte.sendMail({ from, to: params.emailProfessor, subject, html });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, erro: err?.message ?? "Erro ao enviar e-mail." };
  }
}

// ── Template HTML — Lembrete de Aula ─────────────────────────────────────────
// Usado quando a empresa não tem Fonnte nem Evolution configurados — nesse
// caso o lembrete de aula (que por padrão vai por WhatsApp) cai automaticamente
// pro e-mail do responsável. `aulas` tem 1 item pra aula única, ou 2+ quando o
// aluno tem aulas seguidas no mesmo dia (1 e-mail só, listando todas — mesma
// regra de agrupamento do WhatsApp, ver montarBlocosAula em notificacoes.ts).
function templateAula(params: {
  nomeEmpresa: string;
  nomeResponsavel: string | null;
  nomeAluno: string;
  dataFormatada: string;
  aulas: { horario: string; materia: string | null; professor: string }[];
}) {
  const { nomeEmpresa, nomeResponsavel, nomeAluno, dataFormatada, aulas } = params;
  const multipla = aulas.length > 1;

  const subject = multipla
    ? `📚 Lembrete: ${aulas.length} aulas de ${nomeAluno} amanhã`
    : `📚 Lembrete de aula — ${nomeAluno} amanhã`;

  const linhasAulas = aulas.map((a) => `
                    <tr>
                      <td style="color:#6b7280;font-size:13px;width:40%;">${a.horario}</td>
                      <td style="color:#111827;font-size:13px;">${a.materia ? `${a.materia} — ` : ""}Prof. ${a.professor}</td>
                    </tr>`).join("");

  return {
    subject,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Cabeçalho -->
        <tr>
          <td style="background:#111827;padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px;">▲ EduGestão</p>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Gestão Educacional</p>
          </td>
        </tr>

        <!-- Alerta -->
        <tr>
          <td style="background:#eff6ff;border-bottom:3px solid #93c5fd;padding:16px 32px;">
            <p style="margin:0;color:#1d4ed8;font-size:15px;font-weight:bold;">
              ⚠️ Amanhã a(o) ${nomeAluno} tem ${multipla ? `${aulas.length} aulas seguidas agendadas` : "aula agendada"}
            </p>
          </td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              Olá${nomeResponsavel ? `, <strong>${nomeResponsavel}</strong>` : ""}!
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
              Este é um lembrete de que <strong>${nomeAluno}</strong> tem aula agendada pra amanhã.
            </p>

            <!-- Card detalhes -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <table width="100%" cellpadding="6" cellspacing="0">
                    <tr>
                      <td style="color:#6b7280;font-size:13px;width:40%;">Data</td>
                      <td style="color:#1d4ed8;font-size:13px;font-weight:bold;">${dataFormatada}</td>
                    </tr>${linhasAulas}
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#374151;font-size:14px;">Até lá! 📚</p>
          </td>
        </tr>

        <!-- Rodapé -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Mensagem automática enviada por <strong>${nomeEmpresa}</strong> via EduGestão.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export async function enviarEmailAula(
  params: Parameters<typeof templateAula>[0] & { emailResponsavel: string },
  credenciais: EmailCredenciais,
): Promise<{ ok: boolean; erro?: string }> {
  const transporte = criarTransporte(credenciais);
  if (!transporte) return { ok: false, erro: "E-mail não configurado." };

  const { subject, html } = templateAula(params);
  const from = limparEnv(credenciais.emailFrom) ?? limparEnv(credenciais.emailUser) ?? "EduGestão";

  try {
    await transporte.sendMail({ from, to: params.emailResponsavel, subject, html });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, erro: err?.message ?? "Erro ao enviar e-mail." };
  }
}

// ── Template HTML — Recibo Múltiplo ──────────────────────────────────────────
function templateReciboMultiplo(params: {
  nomeResponsavel: string;
  nomeProfessora: string;
  itens: Array<{
    nomeAluno:     string;
    tipoCobranca:  string;
    valorCobrado:  number;
    dataPagamento: Date;
    mes:           number;
    ano:           number;
    parcela?:      number;
    quantidadeAulas?: number | null;
  }>;
  total: number;
}) {
  const { nomeResponsavel, nomeProfessora, itens, total } = params;

  const linhas = itens.map((item) => {
    const tipoFmt     = TIPO_LABEL[item.tipoCobranca] ?? item.tipoCobranca;
    const parcelaFmt  = item.parcela && item.parcela > 1 ? ` (${item.parcela}ª)` : "";
    const dataFmt     = item.dataPagamento.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const mesFmt      = `${MESES[item.mes - 1]}/${item.ano}`;
    return `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 12px;color:#111827;font-size:13px;font-weight:bold;">${item.nomeAluno}</td>
        <td style="padding:10px 12px;color:#6b7280;font-size:12px;">${mesFmt}</td>
        <td style="padding:10px 12px;color:#6b7280;font-size:12px;">${tipoFmt}${parcelaFmt}</td>
        <td style="padding:10px 12px;color:#15803d;font-size:13px;font-weight:bold;">${dataFmt}</td>
        <td style="padding:10px 12px;color:#15803d;font-size:13px;font-weight:bold;text-align:right;">${moeda(item.valorCobrado)}</td>
      </tr>`;
  }).join("");

  const tituloEmail = itens.length === 1
    ? `✅ Pagamento confirmado — ${itens[0].nomeAluno} · ${MESES[itens[0].mes - 1]} de ${itens[0].ano}`
    : `✅ ${itens.length} pagamentos confirmados — EduGestão`;

  return {
    subject: tituloEmail,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#111827;padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px;">▲ EduGestão</p>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Gestão Educacional</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f0fdf4;border-bottom:3px solid #86efac;padding:16px 32px;">
            <p style="margin:0;color:#15803d;font-size:15px;font-weight:bold;">
              ✅ ${itens.length === 1 ? "Pagamento recebido com sucesso!" : `${itens.length} pagamentos recebidos com sucesso!`}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              Prezado(a) <strong>${nomeResponsavel}</strong>,
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
              Confirmamos o recebimento ${itens.length === 1 ? "do pagamento" : "dos pagamentos"} abaixo. Guarde este e-mail como comprovante.
            </p>

            <!-- Tabela de pagamentos -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;overflow:hidden;">
              <thead>
                <tr style="background:#e2e8f0;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151;">Aluno(a)</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151;">Competência</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151;">Tipo</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151;">Pago em</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;color:#374151;">Valor</th>
                </tr>
              </thead>
              <tbody>${linhas}</tbody>
              ${itens.length > 1 ? `
              <tfoot>
                <tr style="background:#f0fdf4;">
                  <td colspan="4" style="padding:12px;color:#15803d;font-size:13px;font-weight:bold;text-align:right;">Total</td>
                  <td style="padding:12px;color:#15803d;font-size:15px;font-weight:bold;text-align:right;">${moeda(total)}</td>
                </tr>
              </tfoot>` : ""}
            </table>

            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Professor(a): <strong style="color:#374151;">${nomeProfessora}</strong></p>
            <p style="margin:16px 0 0;color:#374151;font-size:14px;">Agradecemos a pontualidade! 🙏</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Mensagem automática enviada pelo <strong>EduGestão</strong>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export async function enviarEmailReciboMultiplo(params: Parameters<typeof templateReciboMultiplo>[0] & {
  emailResponsavel: string;
}, credenciais: EmailCredenciais): Promise<{ ok: boolean; erro?: string }> {
  const transporte = criarTransporte(credenciais);
  if (!transporte) return { ok: false, erro: "E-mail não configurado." };
  const { subject, html } = templateReciboMultiplo(params);
  const from = limparEnv(credenciais.emailFrom) ?? limparEnv(credenciais.emailUser) ?? "EduGestão";
  try {
    await transporte.sendMail({ from, to: params.emailResponsavel, subject, html });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, erro: err?.message ?? "Erro ao enviar e-mail." };
  }
}

// ── Template HTML — Cobrança Múltipla (lembrete + atraso unificados por aluno) ──
function templateCobrancaMultipla(params: {
  nomeResponsavel: string;
  nomeAluno: string;
  nomeProfessora: string;
  itens: Array<{
    tipoCobranca:   string;
    valorCobrado:   number;
    dataVencimento: Date;
    mes:            number;
    ano:            number;
    parcela?:       number;
    atrasado:       boolean;
  }>;
  total: number;
}) {
  const { nomeResponsavel, nomeAluno, nomeProfessora, itens, total } = params;
  const temAtraso = itens.some((i) => i.atrasado);
  const todasAtraso = itens.every((i) => i.atrasado);

  const linhas = itens.map((item) => {
    const tipoFmt    = TIPO_LABEL[item.tipoCobranca] ?? item.tipoCobranca;
    const parcelaFmt = item.parcela && item.parcela > 1 ? ` (${item.parcela}ª)` : "";
    const dataFmt    = item.dataVencimento.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const mesFmt     = `${MESES[item.mes - 1]}/${item.ano}`;
    const statusCor  = item.atrasado ? "#dc2626" : "#1d4ed8";
    const statusTxt  = item.atrasado ? "Em atraso" : "A vencer";
    return `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 12px;color:#6b7280;font-size:12px;">${mesFmt}</td>
        <td style="padding:10px 12px;color:#6b7280;font-size:12px;">${tipoFmt}${parcelaFmt}</td>
        <td style="padding:10px 12px;color:${statusCor};font-size:13px;font-weight:bold;">${dataFmt}</td>
        <td style="padding:10px 12px;color:${statusCor};font-size:12px;font-weight:bold;">${statusTxt}</td>
        <td style="padding:10px 12px;color:#111827;font-size:13px;font-weight:bold;text-align:right;">${moeda(item.valorCobrado)}</td>
      </tr>`;
  }).join("");

  const corFaixa   = temAtraso ? "#fef2f2" : "#eff6ff";
  const corBorda   = temAtraso ? "#fca5a5" : "#93c5fd";
  const corTitulo  = temAtraso ? "#dc2626" : "#1d4ed8";
  const icone      = temAtraso ? "⚠️" : "📅";
  const tituloFaixa = itens.length === 1
    ? (todasAtraso ? "Aviso de pagamento em atraso" : "Lembrete de pagamento próximo ao vencimento")
    : todasAtraso
      ? `${itens.length} pagamentos em atraso`
      : temAtraso
        ? `${itens.length} cobranças pendentes (parte em atraso)`
        : `${itens.length} pagamentos próximos ao vencimento`;

  const assunto = itens.length === 1
    ? (todasAtraso ? `⚠️ Pagamento em atraso — ${nomeAluno}` : `📅 Lembrete de vencimento — ${nomeAluno}`)
    : `${icone} ${itens.length} cobranças pendentes — ${nomeAluno}`;

  return {
    subject: assunto,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#111827;padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px;">▲ EduGestão</p>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Gestão Educacional</p>
          </td>
        </tr>
        <tr>
          <td style="background:${corFaixa};border-bottom:3px solid ${corBorda};padding:16px 32px;">
            <p style="margin:0;color:${corTitulo};font-size:15px;font-weight:bold;">
              ${icone} ${tituloFaixa}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              Prezado(a) <strong>${nomeResponsavel}</strong>,
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
              Segue${itens.length > 1 ? "m" : ""} abaixo ${itens.length > 1 ? "as cobranças pendentes" : "a cobrança pendente"}
              referente${itens.length > 1 ? "s" : ""} às aulas do(a) aluno(a) <strong>${nomeAluno}</strong>.
              ${temAtraso ? "Por gentileza, regularize o quanto antes." : ""}
            </p>

            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;overflow:hidden;">
              <thead>
                <tr style="background:#e2e8f0;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151;">Competência</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151;">Tipo</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151;">Vencimento</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151;">Status</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;color:#374151;">Valor</th>
                </tr>
              </thead>
              <tbody>${linhas}</tbody>
              ${itens.length > 1 ? `
              <tfoot>
                <tr style="background:#f8fafc;">
                  <td colspan="4" style="padding:12px;color:#111827;font-size:13px;font-weight:bold;text-align:right;">Total</td>
                  <td style="padding:12px;color:#111827;font-size:15px;font-weight:bold;text-align:right;">${moeda(total)}</td>
                </tr>
              </tfoot>` : ""}
            </table>

            <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">
              Em caso de dúvidas, entre em contato com o(a) professor(a) responsável.
            </p>
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Professor(a): <strong style="color:#374151;">${nomeProfessora}</strong></p>
            <p style="margin:16px 0 0;color:#374151;font-size:14px;">Obrigado! 😊</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Mensagem automática enviada pelo <strong>EduGestão</strong>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export async function enviarEmailCobrancaMultipla(params: Parameters<typeof templateCobrancaMultipla>[0] & {
  emailResponsavel: string;
}, credenciais: EmailCredenciais): Promise<{ ok: boolean; erro?: string }> {
  const transporte = criarTransporte(credenciais);
  if (!transporte) return { ok: false, erro: "E-mail não configurado." };
  const { subject, html } = templateCobrancaMultipla(params);
  const from = limparEnv(credenciais.emailFrom) ?? limparEnv(credenciais.emailUser) ?? "EduGestão";
  try {
    await transporte.sendMail({ from, to: params.emailResponsavel, subject, html });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, erro: err?.message ?? "Erro ao enviar e-mail." };
  }
}

// ── Template HTML — Redefinição de Senha ─────────────────────────────────────
function templateRedefinirSenha(params: { nomeUsuario: string; link: string }) {
  const { nomeUsuario, link } = params;

  return {
    subject: "🔒 Redefinição de senha — EduGestão",
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#111827;padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px;">▲ EduGestão</p>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Gestão Educacional</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              Olá, <strong>${nomeUsuario}</strong>,
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
              Recebemos uma solicitação para redefinir sua senha no EduGestão.
              Clique no botão abaixo para escolher uma nova senha. Este link
              expira em 1 hora.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:8px 0 24px;">
                  <a href="${link}" style="background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 28px;border-radius:8px;display:inline-block;">
                    Redefinir senha
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
              Se você não solicitou essa alteração, pode ignorar este e-mail —
              sua senha atual continua válida.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Mensagem automática enviada pelo <strong>EduGestão</strong>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export async function enviarEmailRedefinirSenha(params: Parameters<typeof templateRedefinirSenha>[0] & {
  emailUsuario: string;
}, credenciais: EmailCredenciais): Promise<{ ok: boolean; erro?: string }> {
  const transporte = criarTransporte(credenciais);
  if (!transporte) return { ok: false, erro: "E-mail não configurado." };
  const { subject, html } = templateRedefinirSenha(params);
  const from = limparEnv(credenciais.emailFrom) ?? limparEnv(credenciais.emailUser) ?? "EduGestão";
  try {
    await transporte.sendMail({ from, to: params.emailUsuario, subject, html });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, erro: err?.message ?? "Erro ao enviar e-mail." };
  }
}

// ── Template HTML — Alerta de WhatsApp (Fonnte) Desconectado ────────────────
// Enviado pra usuários PLATAFORMA (via SMTP global, mesmo padrão do e-mail de
// redefinição de senha da plataforma) quando o device Fonnte de uma empresa
// cai — ver processarVerificacaoFonnte em src/lib/notificacoes.ts.
function templateAlertaFonnte(params: { nomeEmpresa: string }) {
  const { nomeEmpresa } = params;

  return {
    subject: `⚠️ WhatsApp desconectado — ${nomeEmpresa}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#111827;padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px;">▲ EduGestão</p>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Gestão Educacional</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fef2f2;border-bottom:3px solid #fca5a5;padding:16px 32px;">
            <p style="margin:0;color:#dc2626;font-size:15px;font-weight:bold;">
              ⚠️ WhatsApp (Fonnte) desconectado
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
              O device do Fonnte da empresa <strong>${nomeEmpresa}</strong> está desconectado.
              Enquanto isso, os lembretes de prova e de aula dessa empresa não estão
              sendo enviados por WhatsApp.
            </p>
            <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
              Acesse o painel do Fonnte dessa empresa e reconecte o número
              escaneando o QR Code novamente.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Mensagem automática enviada pelo <strong>EduGestão</strong>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export async function enviarEmailAlertaFonnte(params: Parameters<typeof templateAlertaFonnte>[0] & {
  emailDestino: string;
}, credenciais: EmailCredenciais): Promise<{ ok: boolean; erro?: string }> {
  const transporte = criarTransporte(credenciais);
  if (!transporte) return { ok: false, erro: "E-mail não configurado." };
  const { subject, html } = templateAlertaFonnte(params);
  const from = limparEnv(credenciais.emailFrom) ?? limparEnv(credenciais.emailUser) ?? "EduGestão";
  try {
    await transporte.sendMail({ from, to: params.emailDestino, subject, html });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, erro: err?.message ?? "Erro ao enviar e-mail." };
  }
}

// ── Função principal de envio ─────────────────────────────────────────────────
export async function enviarEmailAtraso(params: Parameters<typeof templateAtraso>[0] & {
  emailResponsavel: string;
}, credenciais: EmailCredenciais): Promise<{ ok: boolean; erro?: string }> {
  const transporte = criarTransporte(credenciais);
  if (!transporte) {
    return { ok: false, erro: "E-mail não configurado." };
  }

  const { subject, html } = templateAtraso(params);
  const from = limparEnv(credenciais.emailFrom) ?? limparEnv(credenciais.emailUser) ?? "EduGestão";

  try {
    await transporte.sendMail({
      from,
      to: params.emailResponsavel,
      subject,
      html,
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, erro: err?.message ?? "Erro ao enviar e-mail." };
  }
}
