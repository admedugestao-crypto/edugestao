import { prisma } from "./prisma";
import { enviarEmailProva, emailConfigurado } from "./email";

// ── Formata número WhatsApp para o padrão internacional ─────────────────────
export function formatarWhatsapp(num: string): string {
  const digits = num.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

// ── Monta a mensagem de notificação ─────────────────────────────────────────
export function montarMensagem(params: {
  nomeProfessor: string;
  nomeAvaliacao: string;
  nomeMateria: string | null;
  nomeEscola: string;
  nomeUnidade: string;
  serie: string;
  dataProva: Date;
  diasRestantes: number;
  nomesAlunos: string[];
}): string {
  const { nomeProfessor, nomeAvaliacao, nomeMateria, nomeEscola, nomeUnidade, serie, dataProva, diasRestantes, nomesAlunos } = params;

  const dataFormatada = dataProva.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });

  const dataSimples = dataProva.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  const aviso =
    diasRestantes === 0
      ? `🔔 *HOJE (${dataSimples}) é dia de prova!*`
      : diasRestantes === 1
      ? `⚠️ *Amanhã (${dataSimples}) é dia de prova!*`
      : `📅 Faltam *${diasRestantes} dias* para a prova — *${dataSimples}*`;

  const linhasAlunos = nomesAlunos.length > 0
    ? [`👥 *Alunos (${nomesAlunos.length}):*`, ...nomesAlunos.map((n) => `   • ${n}`)]
    : [];

  return [
    `📚 *EduGestão – Lembrete de Prova*`,
    ``,
    `Olá, prof. *${nomeProfessor}*!`,
    ``,
    aviso,
    ``,
    `📝 *Avaliação:* ${nomeAvaliacao}${nomeMateria ? ` – ${nomeMateria}` : ""}`,
    `🏫 *Escola:* ${nomeEscola}`,
    `🏢 *Unidade:* ${nomeUnidade}`,
    `📖 *Série:* ${serie}`,
    `📆 *Data:* ${dataFormatada}`,
    ...(linhasAlunos.length > 0 ? [``, ...linhasAlunos] : []),
    ``,
    `_Mensagem automática do EduGestão_`,
  ].join("\n");
}

// ── Busca avaliações nos próximos 30 dias ────────────────────────────────────
async function buscarAvaliacoes() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em30dias = new Date(hoje);
  em30dias.setDate(em30dias.getDate() + 30);
  em30dias.setHours(23, 59, 59, 999);

  return prisma.avaliacao.findMany({
    where: { data: { gte: hoje, lte: em30dias } },
    include: { unidade: { include: { escola: true } }, materia: true },
  });
}

/** Busca professores com alunos ativos na unidade+série da avaliação */
async function buscarProfessores(unidadeId: string, serie: string) {
  return prisma.professora.findMany({
    where: {
      alunos: { some: { unidadeId, serie, status: "ATIVO" } },
    },
    include: {
      usuario: { select: { nome: true, email: true, whatsapp: true } },
      alunos: {
        where: { unidadeId, serie, status: "ATIVO" },
        select: { nome: true },
        orderBy: { nome: "asc" },
      },
    },
  });
}

// ── Resultado de uma tentativa de envio, com motivo real da falha ───────────
export type EnvioResultado = { ok: boolean; provedor: string; erro?: string };

async function corpoErro(res: Response): Promise<string> {
  const texto = await res.text().catch(() => "");
  return `HTTP ${res.status}${texto ? `: ${texto.slice(0, 300)}` : ""}`;
}

// ── Envia via Fonnte ──────────────────────────────────────────────────────────
async function enviarViaFonnte(numero: string, mensagem: string): Promise<EnvioResultado> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) return { ok: false, provedor: "fonnte", erro: "não configurado" };
  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ target: numero, message: mensagem, countryCode: "55" }).toString(),
    });
    const texto = await res.text();
    let data: any = null;
    try { data = JSON.parse(texto); } catch { /* resposta não-JSON */ }
    if (res.ok && data?.status === true) return { ok: true, provedor: "fonnte" };
    return { ok: false, provedor: "fonnte", erro: `HTTP ${res.status}: ${texto.slice(0, 300)}` };
  } catch (err) {
    return { ok: false, provedor: "fonnte", erro: String(err) };
  }
}

// ── Envia via Evolution API ──────────────────────────────────────────────────
async function enviarViaEvolutionAPI(numero: string, mensagem: string): Promise<EnvioResultado> {
  const url = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;
  if (!url || !apiKey || !instance) return { ok: false, provedor: "evolution", erro: "não configurado" };
  try {
    const res = await fetch(`${url}/message/sendText/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({ number: numero, text: mensagem }),
    });
    if (res.ok) return { ok: true, provedor: "evolution" };
    return { ok: false, provedor: "evolution", erro: await corpoErro(res) };
  } catch (err) {
    return { ok: false, provedor: "evolution", erro: String(err) };
  }
}

// ── Envia via Z-API ──────────────────────────────────────────────────────────
async function enviarViaZAPI(numero: string, mensagem: string): Promise<EnvioResultado> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;
  if (!instanceId || !token) return { ok: false, provedor: "z-api", erro: "não configurado" };
  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(clientToken ? { "Client-Token": clientToken } : {}),
        },
        body: JSON.stringify({ phone: numero, message: mensagem }),
      }
    );
    if (res.ok) return { ok: true, provedor: "z-api" };
    return { ok: false, provedor: "z-api", erro: await corpoErro(res) };
  } catch (err) {
    return { ok: false, provedor: "z-api", erro: String(err) };
  }
}

// ── Tenta, em cascata, todos os provedores de WhatsApp configurados ─────────
// (Fonnte → Z-API → Evolution) — para no primeiro que funcionar, e reporta o
// motivo real de cada falha (visível nos logs da função e na resposta da API).
export async function enviarWhatsapp(numero: string, mensagem: string): Promise<EnvioResultado> {
  const tentativas = [enviarViaFonnte, enviarViaZAPI, enviarViaEvolutionAPI];
  const erros: string[] = [];

  for (const tentativa of tentativas) {
    const resultado = await tentativa(numero, mensagem);
    if (resultado.ok) return resultado;
    if (resultado.erro !== "não configurado") {
      console.error(`[WhatsApp] Falha via ${resultado.provedor} para ${numero}: ${resultado.erro}`);
    }
    erros.push(`${resultado.provedor}: ${resultado.erro}`);
  }

  return { ok: false, provedor: "nenhum", erro: erros.join(" | ") };
}

// ── PROCESSO 1: WhatsApp ─────────────────────────────────────────────────────
export async function processarNotificacoes(): Promise<{
  enviadas: number;
  pendentes: { numero: string; mensagem: string; professorNome: string; avaliacaoNome: string; erro?: string }[];
  erros: string[];
}> {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const avaliacoes = await buscarAvaliacoes();
  const resultado = { enviadas: 0, pendentes: [] as any[], erros: [] as string[] };

  for (const av of avaliacoes) {
    const dataProva = new Date(av.data); dataProva.setHours(0, 0, 0, 0);
    const diasRestantes = Math.round((dataProva.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    // Só notifica até 1 dia antes — no dia da prova não envia mais
    if (diasRestantes < 1) continue;

    const professores = await buscarProfessores(av.unidadeId, av.serie);

    for (const prof of professores) {
      if (!prof.usuario.whatsapp) continue;

      try {
        // Deduplicação: só envia se ainda não enviou WhatsApp neste ciclo
        const registro = await prisma.notificacaoProva.findUnique({
          where: { professoraId_avaliacaoId_diasAntes: { professoraId: prof.id, avaliacaoId: av.id, diasAntes: diasRestantes } },
        });
        if (registro?.enviada) continue;

        const numero = formatarWhatsapp(prof.usuario.whatsapp);
        const nomesAlunos = prof.alunos.map((a) => a.nome);
        const mensagem = montarMensagem({
          nomeProfessor: prof.usuario.nome,
          nomeAvaliacao: av.nome,
          nomeMateria: av.materia?.nome ?? null,
          nomeEscola: av.unidade.escola.nome,
          nomeUnidade: av.unidade.nome,
          serie: av.serie,
          dataProva,
          diasRestantes,
          nomesAlunos,
        });

        const envio = await enviarWhatsapp(numero, mensagem);

        await prisma.notificacaoProva.upsert({
          where: { professoraId_avaliacaoId_diasAntes: { professoraId: prof.id, avaliacaoId: av.id, diasAntes: diasRestantes } },
          update: { enviada: envio.ok, whatsapp: numero },
          create: { professoraId: prof.id, avaliacaoId: av.id, diasAntes: diasRestantes, whatsapp: numero, enviada: envio.ok },
        });

        if (envio.ok) {
          resultado.enviadas++;
        } else {
          resultado.pendentes.push({ numero, mensagem, professorNome: prof.usuario.nome, avaliacaoNome: av.nome, erro: envio.erro });
          resultado.erros.push(`WhatsApp – ${prof.usuario.nome}: ${envio.erro}`);
        }
      } catch (err) {
        resultado.erros.push(`WhatsApp – ${prof.usuario.nome}: ${String(err)}`);
      }
    }
  }

  return resultado;
}

// ── PROCESSO 2: E-mail ───────────────────────────────────────────────────────
export async function processarNotificacoesEmail(): Promise<{
  enviadas: number;
  erros: string[];
}> {
  const resultado = { enviadas: 0, erros: [] as string[] };

  if (!emailConfigurado()) {
    resultado.erros.push("E-mail não configurado (EMAIL_HOST / EMAIL_USER / EMAIL_PASS ausentes).");
    return resultado;
  }

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const avaliacoes = await buscarAvaliacoes();

  for (const av of avaliacoes) {
    const dataProva = new Date(av.data); dataProva.setHours(0, 0, 0, 0);
    const diasRestantes = Math.round((dataProva.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    // Só notifica até 1 dia antes — no dia da prova não envia mais
    if (diasRestantes < 1) continue;

    const professores = await buscarProfessores(av.unidadeId, av.serie);

    for (const prof of professores) {
      if (!prof.usuario.email) continue;

      try {
        // Deduplicação: só envia se ainda não enviou e-mail neste ciclo
        const registro = await prisma.notificacaoProva.findUnique({
          where: { professoraId_avaliacaoId_diasAntes: { professoraId: prof.id, avaliacaoId: av.id, diasAntes: diasRestantes } },
        });
        if (registro?.emailEnviado) continue;

        const nomesAlunos = prof.alunos.map((a) => a.nome);

        const { ok, erro } = await enviarEmailProva({
          emailProfessor: prof.usuario.email,
          nomeProfessor:  prof.usuario.nome,
          nomeAvaliacao:  av.nome,
          nomeMateria:    av.materia?.nome ?? null,
          nomeEscola:     av.unidade.escola.nome,
          nomeUnidade:    av.unidade.nome,
          serie:          av.serie,
          dataProva,
          diasRestantes,
          nomesAlunos,
        });

        await prisma.notificacaoProva.upsert({
          where: { professoraId_avaliacaoId_diasAntes: { professoraId: prof.id, avaliacaoId: av.id, diasAntes: diasRestantes } },
          update: { emailEnviado: ok, email: prof.usuario.email },
          create: {
            professoraId: prof.id, avaliacaoId: av.id, diasAntes: diasRestantes,
            email: prof.usuario.email, emailEnviado: ok,
          },
        });

        if (ok) {
          resultado.enviadas++;
        } else {
          resultado.erros.push(`${prof.usuario.nome} (${prof.usuario.email}): ${erro}`);
        }
      } catch (err) {
        resultado.erros.push(`E-mail – ${prof.usuario.nome}: ${String(err)}`);
      }
    }
  }

  return resultado;
}

// ── PROCESSO 3: WhatsApp para responsáveis (1 dia antes da aula) ─────────────
export async function processarNotificacoesAula(): Promise<{
  enviadas: number;
  erros: string[];
}> {
  const resultado = { enviadas: 0, erros: [] as string[] };
  const fonnteConfigurada = !!process.env.FONNTE_TOKEN;
  const zapiConfigurada = !!(process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN);
  const evolutionConfigurada = !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE);

  if (!fonnteConfigurada && !zapiConfigurada && !evolutionConfigurada) return resultado;

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);
  const fimAmanha = new Date(amanha);
  fimAmanha.setHours(23, 59, 59, 999);

  const aulas = await prisma.agendaAula.findMany({
    where: {
      data: { gte: amanha, lte: fimAmanha },
      status: "AGENDADA",
      aluno: { telefoneResponsavel: { not: null } },
    },
    include: {
      aluno: true,
      professora: { include: { usuario: { select: { nome: true } } } },
      materia: true,
      notificacao: true,
    },
  });

  for (const aula of aulas) {
    if (aula.notificacao?.enviada) continue;

    const numero = formatarWhatsapp(aula.aluno.telefoneResponsavel!);

    const dataFormatada = new Date(aula.data).toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    });

    const horario = aula.horaInicio
      ? aula.horaFim ? `${aula.horaInicio} – ${aula.horaFim}` : aula.horaInicio
      : "horário a confirmar";

    const mensagem = [
      `📚 *EduGestão – Lembrete de Aula*`,
      ``,
      `Olá${aula.aluno.responsavel ? `, *${aula.aluno.responsavel}*` : ""}!`,
      ``,
      `⚠️ *Amanhã* a(o) *${aula.aluno.nome}* tem aula agendada:`,
      ``,
      ...(aula.materia ? [`📖 *Disciplina:* ${aula.materia.nome}`] : []),
      `📆 *Data:* ${dataFormatada}`,
      `🕐 *Horário:* ${horario}`,
      `👩‍🏫 *Professor(a):* ${aula.professora.usuario.nome}`,
      ``,
      `_Mensagem automática do EduGestão_`,
    ].join("\n");

    try {
      const envio = await enviarWhatsapp(numero, mensagem);

      await prisma.notificacaoAula.upsert({
        where: { agendaAulaId: aula.id },
        update: { enviada: envio.ok, whatsapp: numero },
        create: { agendaAulaId: aula.id, enviada: envio.ok, whatsapp: numero },
      });

      if (envio.ok) resultado.enviadas++;
      else resultado.erros.push(`${aula.aluno.nome} (${numero}): ${envio.erro}`);
    } catch (err) {
      resultado.erros.push(`${aula.aluno.nome}: ${String(err)}`);
    }
  }

  return resultado;
}
