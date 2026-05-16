import nodemailer from "nodemailer";

// ── Transportador SMTP ────────────────────────────────────────────────────────
function criarTransporte() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return null;

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT ?? "587"),
    secure: parseInt(EMAIL_PORT ?? "587") === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

export function emailConfigurado() {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
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
}): Promise<{ ok: boolean; erro?: string }> {
  const transporte = criarTransporte();
  if (!transporte) return { ok: false, erro: "E-mail não configurado no servidor." };
  const { subject, html } = templateLembrete(params);
  const from = process.env.EMAIL_FROM ?? process.env.EMAIL_USER ?? "EduGestão";
  try {
    await transporte.sendMail({ from, to: params.emailResponsavel, subject, html });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, erro: err?.message ?? "Erro ao enviar e-mail." };
  }
}

export async function enviarEmailRecibo(params: Parameters<typeof templateRecibo>[0] & {
  emailResponsavel: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const transporte = criarTransporte();
  if (!transporte) return { ok: false, erro: "E-mail não configurado no servidor." };
  const { subject, html } = templateRecibo(params);
  const from = process.env.EMAIL_FROM ?? process.env.EMAIL_USER ?? "EduGestão";
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
}) {
  const {
    nomeProfessor, nomeAvaliacao, nomeMateria, nomeEscola,
    nomeUnidade, serie, dataProva, diasRestantes, nomesAlunos,
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
  params: Parameters<typeof templateProva>[0] & { emailProfessor: string }
): Promise<{ ok: boolean; erro?: string }> {
  const transporte = criarTransporte();
  if (!transporte) return { ok: false, erro: "E-mail não configurado no servidor." };

  const { subject, html } = templateProva(params);
  const from = process.env.EMAIL_FROM ?? process.env.EMAIL_USER ?? "EduGestão";

  try {
    await transporte.sendMail({ from, to: params.emailProfessor, subject, html });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, erro: err?.message ?? "Erro ao enviar e-mail." };
  }
}

// ── Função principal de envio ─────────────────────────────────────────────────
export async function enviarEmailAtraso(params: Parameters<typeof templateAtraso>[0] & {
  emailResponsavel: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const transporte = criarTransporte();
  if (!transporte) {
    return { ok: false, erro: "E-mail não configurado no servidor." };
  }

  const { subject, html } = templateAtraso(params);
  const from = process.env.EMAIL_FROM ?? process.env.EMAIL_USER ?? "EduGestão";

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
