import { prisma } from "./prisma";
import { enviarEmailProva, enviarEmailAula, type EmailCredenciais } from "./email";
import { limparEnv } from "./envUtil";

// ── Formata número WhatsApp para o padrão internacional ─────────────────────
export function formatarWhatsapp(num: string): string {
  // Remove zero(s) de tronco à esquerda (ex: "031999999999" → "31999999999") —
  // nenhum DDD real começa com 0, então sobra sempre indica erro de digitação.
  const digits = num.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

// ── Monta a mensagem de notificação ─────────────────────────────────────────
export function montarMensagem(params: {
  nomeEmpresa: string;
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
}): string {
  const { nomeEmpresa, nomeProfessor, nomeAvaliacao, nomeMateria, nomeEscola, nomeUnidade, serie, dataProva, diasRestantes, nomesAlunos, observacao } = params;

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
    `📚 *${nomeEmpresa} – Lembrete de Prova*`,
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
    ...(observacao ? [`💬 *Observação:* ${observacao}`] : []),
    ...(linhasAlunos.length > 0 ? [``, ...linhasAlunos] : []),
    ``,
    `_Mensagem automática de ${nomeEmpresa} via EduGestão_`,
  ].join("\n");
}

// ── Busca avaliações nos próximos 30 dias (escopado a uma empresa) ──────────
async function buscarAvaliacoes(empresaId: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em30dias = new Date(hoje);
  em30dias.setDate(em30dias.getDate() + 30);
  em30dias.setHours(23, 59, 59, 999);

  return prisma.avaliacao.findMany({
    where: { empresaId, data: { gte: hoje, lte: em30dias } },
    include: { unidade: { include: { escola: true } }, materia: true },
  });
}

/** Busca professores com alunos ativos na unidade+série da avaliação (mesma empresa) */
async function buscarProfessores(empresaId: string, unidadeId: string, serie: string) {
  return prisma.professora.findMany({
    where: {
      empresaId,
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

// ── Credenciais de WhatsApp de UMA empresa (cada empresa tem sua própria
// conta nos provedores homologados — sem fallback pra credencial global). ──
export type WhatsappCredenciais = {
  fonnteToken?: string | null;
  evolutionApiUrl?: string | null;
  evolutionApiKey?: string | null;
  evolutionApiInstance?: string | null;
};

// ── Envia via Fonnte ──────────────────────────────────────────────────────────
async function enviarViaFonnte(numero: string, mensagem: string, token: string | null | undefined): Promise<EnvioResultado> {
  const tokenLimpo = limparEnv(token);
  if (!tokenLimpo) return { ok: false, provedor: "fonnte", erro: "não configurado" };
  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: tokenLimpo, "Content-Type": "application/x-www-form-urlencoded" },
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
async function enviarViaEvolutionAPI(numero: string, mensagem: string, credenciais: WhatsappCredenciais): Promise<EnvioResultado> {
  const url = limparEnv(credenciais.evolutionApiUrl);
  const apiKey = limparEnv(credenciais.evolutionApiKey);
  const instance = limparEnv(credenciais.evolutionApiInstance);
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

// ── Tenta, em cascata, os provedores de WhatsApp configurados PARA ESSA
// EMPRESA — cada empresa usa sua própria conta nos provedores homologados
// (Fonnte/Evolution), sem fallback para credencial global (ver "Fase 3").
// Evolution primeiro, Fonnte como fallback — para no primeiro que funcionar,
// e reporta o motivo real de cada falha (visível nos logs da função e na
// resposta da API). Fonnte foi rebaixado a fallback porque retorna status
// "OK" mesmo quando a mensagem não chega ao destinatário (número
// provavelmente restrito pelo WhatsApp), então nunca acionava o fallback
// antes dessa mudança. Z-API foi removido da cascata (assinatura da
// instância expirada — ver histórico de commits).
export async function enviarWhatsapp(numero: string, mensagem: string, credenciais: WhatsappCredenciais): Promise<EnvioResultado> {
  const tentativas: (() => Promise<EnvioResultado>)[] = [
    () => enviarViaEvolutionAPI(numero, mensagem, credenciais),
    () => enviarViaFonnte(numero, mensagem, credenciais.fonnteToken),
  ];
  const erros: string[] = [];

  for (const tentativa of tentativas) {
    const resultado = await tentativa();
    if (resultado.ok) return resultado;
    if (resultado.erro !== "não configurado") {
      console.error(`[WhatsApp] Falha via ${resultado.provedor} para ${numero}: ${resultado.erro}`);
    }
    erros.push(`${resultado.provedor}: ${resultado.erro}`);
  }

  return { ok: false, provedor: "nenhum", erro: erros.join(" | ") };
}

// ── PROCESSO 1: WhatsApp ─────────────────────────────────────────────────────
// Itera por empresa — cada empresa é processada de forma isolada (mesmo
// usando as mesmas credenciais globais de WhatsApp para todas, o nome da
// empresa é embutido no texto da mensagem, ver montarMensagem()).
export async function processarNotificacoes(): Promise<{
  enviadas: number;
  pendentes: { numero: string; mensagem: string; professorNome: string; avaliacaoNome: string; erro?: string }[];
  erros: string[];
}> {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const resultado = { enviadas: 0, pendentes: [] as any[], erros: [] as string[] };
  const empresas = await prisma.empresa.findMany({
    where: { ativo: true, whatsappPausado: false },
    select: { id: true, nome: true, fonnteToken: true, evolutionApiUrl: true, evolutionApiKey: true, evolutionApiInstance: true },
  });

  for (const empresa of empresas) {
    const avaliacoes = await buscarAvaliacoes(empresa.id);

    for (const av of avaliacoes) {
      const dataProva = new Date(av.data); dataProva.setHours(0, 0, 0, 0);
      const diasRestantes = Math.round((dataProva.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      // Só notifica até 1 dia antes — no dia da prova não envia mais
      if (diasRestantes < 1) continue;

      const professores = await buscarProfessores(empresa.id, av.unidadeId, av.serie);

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
            nomeEmpresa: empresa.nome,
            nomeProfessor: prof.usuario.nome,
            nomeAvaliacao: av.nome,
            nomeMateria: av.materia?.nome ?? null,
            nomeEscola: av.unidade.escola.nome,
            nomeUnidade: av.unidade.nome,
            serie: av.serie,
            dataProva,
            diasRestantes,
            nomesAlunos,
            observacao: av.observacao,
          });

          const envio = await enviarWhatsapp(numero, mensagem, empresa);

          await prisma.notificacaoProva.upsert({
            where: { professoraId_avaliacaoId_diasAntes: { professoraId: prof.id, avaliacaoId: av.id, diasAntes: diasRestantes } },
            update: { enviada: envio.ok, whatsapp: numero },
            create: { empresaId: empresa.id, professoraId: prof.id, avaliacaoId: av.id, diasAntes: diasRestantes, whatsapp: numero, enviada: envio.ok },
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
  }

  return resultado;
}

// ── PROCESSO 2: E-mail ───────────────────────────────────────────────────────
export async function processarNotificacoesEmail(): Promise<{
  enviadas: number;
  erros: string[];
}> {
  const resultado = { enviadas: 0, erros: [] as string[] };

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const empresas = await prisma.empresa.findMany({
    where: { ativo: true, emailPausado: false },
    select: { id: true, emailHost: true, emailPort: true, emailUser: true, emailPass: true, emailFrom: true },
  });

  for (const empresa of empresas) {
    const avaliacoes = await buscarAvaliacoes(empresa.id);

    for (const av of avaliacoes) {
      const dataProva = new Date(av.data); dataProva.setHours(0, 0, 0, 0);
      const diasRestantes = Math.round((dataProva.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      // Só notifica até 1 dia antes — no dia da prova não envia mais
      if (diasRestantes < 1) continue;

      const professores = await buscarProfessores(empresa.id, av.unidadeId, av.serie);

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
            observacao:     av.observacao,
          }, empresa);

          await prisma.notificacaoProva.upsert({
            where: { professoraId_avaliacaoId_diasAntes: { professoraId: prof.id, avaliacaoId: av.id, diasAntes: diasRestantes } },
            update: { emailEnviado: ok, email: prof.usuario.email },
            create: {
              empresaId: empresa.id, professoraId: prof.id, avaliacaoId: av.id, diasAntes: diasRestantes,
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
  }

  return resultado;
}

// ── PROCESSO 3: WhatsApp para responsáveis (1 dia antes da aula) ─────────────
// ── Lembrete de aula — dados/mensagens compartilhados entre o envio automático
// (processarNotificacoesAula) e o reenvio manual (reenviarAula em
// src/app/api/notificacoes/reenviar/route.ts), pros dois montarem a mesma
// mensagem/e-mail em vez de duplicar o conteúdo em dois lugares. ────────────
export type AulaParaLembrete = {
  data: Date;
  horaInicio: string | null;
  horaFim: string | null;
  materia: { nome: string } | null;
  professora: { usuario: { nome: string } };
  aluno: { nome: string; responsavel: string | null };
};

export function horarioAula(aula: AulaParaLembrete): string {
  return aula.horaInicio
    ? aula.horaFim ? `${aula.horaInicio} – ${aula.horaFim}` : aula.horaInicio
    : "horário a confirmar";
}

// Aluno com 2+ aulas seguidas no mesmo dia (horaFim de uma bate com
// horaInicio da próxima) recebe UMA mensagem/e-mail só, listando cada aula —
// em vez de um envio separado por aula, que soa repetitivo pro responsável.
export function montarMensagemAulaWhatsapp(bloco: AulaParaLembrete[], nomeEmpresa: string, dataFormatada: string): string {
  const primeira = bloco[0];
  if (bloco.length === 1) {
    return [
      `📚 *${nomeEmpresa} – Lembrete de Aula*`,
      ``,
      `Olá${primeira.aluno.responsavel ? `, *${primeira.aluno.responsavel}*` : ""}!`,
      ``,
      `⚠️ *Amanhã* a(o) *${primeira.aluno.nome}* tem aula agendada:`,
      ``,
      ...(primeira.materia ? [`📖 *Disciplina:* ${primeira.materia.nome}`] : []),
      `📆 *Data:* ${dataFormatada}`,
      `🕐 *Horário:* ${horarioAula(primeira)}`,
      `👩‍🏫 *Professor(a):* ${primeira.professora.usuario.nome}`,
      ``,
      `_Mensagem automática de ${nomeEmpresa} via EduGestão_`,
    ].join("\n");
  }
  const linhasAulas = bloco.map((aula) =>
    `🕐 *${horarioAula(aula)}* — ${aula.materia ? aula.materia.nome : "matéria não definida"} (Prof. ${aula.professora.usuario.nome})`
  );
  return [
    `📚 *${nomeEmpresa} – Lembrete de Aula*`,
    ``,
    `Olá${primeira.aluno.responsavel ? `, *${primeira.aluno.responsavel}*` : ""}!`,
    ``,
    `⚠️ *Amanhã* a(o) *${primeira.aluno.nome}* tem ${bloco.length} aulas seguidas agendadas:`,
    ``,
    ...linhasAulas,
    ``,
    `📆 *Data:* ${dataFormatada}`,
    ``,
    `_Mensagem automática de ${nomeEmpresa} via EduGestão_`,
  ].join("\n");
}

export function montarDadosAulaEmail(bloco: AulaParaLembrete[], nomeEmpresa: string, dataFormatada: string) {
  const primeira = bloco[0];
  return {
    nomeEmpresa,
    nomeResponsavel: primeira.aluno.responsavel,
    nomeAluno: primeira.aluno.nome,
    dataFormatada,
    aulas: bloco.map((aula) => ({
      horario: horarioAula(aula),
      materia: aula.materia?.nome ?? null,
      professor: aula.professora.usuario.nome,
    })),
  };
}

// Empresa "tem WhatsApp configurado" se Fonnte OU Evolution estiverem com as
// credenciais completas — cascata igual a enviarWhatsapp(). Quando NENHUMA
// das duas está configurada, o lembrete de aula cai pro e-mail do responsável
// automaticamente (ver processarNotificacoesAula/reenviarAula) — não tem
// campo de preferência, o gatilho é só a ausência do token.
export function whatsappConfiguradoEmpresa(empresa: {
  fonnteToken?: string | null;
  evolutionApiUrl?: string | null;
  evolutionApiKey?: string | null;
  evolutionApiInstance?: string | null;
}): boolean {
  const fonnteConfigurada = !!empresa.fonnteToken;
  const evolutionConfigurada = !!(empresa.evolutionApiUrl && empresa.evolutionApiKey && empresa.evolutionApiInstance);
  return fonnteConfigurada || evolutionConfigurada;
}

export async function processarNotificacoesAula(): Promise<{
  enviadas: number;
  erros: string[];
}> {
  const resultado = { enviadas: 0, erros: [] as string[] };

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);
  const fimAmanha = new Date(amanha);
  fimAmanha.setHours(23, 59, 59, 999);

  // empresaId é redundante aqui (aula/notificacao já herdam da agenda), mas
  // deixa a query explícita e resistente a joins futuros. O filtro de contato
  // aceita telefone OU e-mail — empresa sem WhatsApp configurado usa e-mail,
  // então um aluno só com e-mail cadastrado (sem telefone) também precisa
  // entrar na query.
  const aulas = await prisma.agendaAula.findMany({
    where: {
      data: { gte: amanha, lte: fimAmanha },
      status: "AGENDADA",
      aluno: { OR: [{ telefoneResponsavel: { not: null } }, { emailResponsavel: { not: null } }] },
      empresa: { whatsappPausado: false },
    },
    include: {
      aluno: true,
      professora: { include: { usuario: { select: { nome: true } } } },
      materia: true,
      notificacao: true,
      empresa: {
        select: {
          nome: true, fonnteToken: true, evolutionApiUrl: true, evolutionApiKey: true, evolutionApiInstance: true,
          emailHost: true, emailPort: true, emailUser: true, emailPass: true, emailFrom: true,
        },
      },
    },
  });

  type AulaComRelacoes = (typeof aulas)[number];

  const pendentes = aulas.filter((a) => !a.notificacao?.enviada && !a.notificacao?.emailEnviado);

  // Agrupa por aluno e depois junta em blocos as aulas consecutivas —
  // é isso que decide quando manda 1 mensagem em vez de N.
  const porAluno = new Map<string, AulaComRelacoes[]>();
  for (const aula of pendentes) {
    const lista = porAluno.get(aula.alunoId) ?? [];
    lista.push(aula);
    porAluno.set(aula.alunoId, lista);
  }

  const blocos: AulaComRelacoes[][] = [];
  for (const lista of porAluno.values()) {
    const ordenada = [...lista].sort((a, b) => (a.horaInicio ?? "").localeCompare(b.horaInicio ?? ""));
    let atual: AulaComRelacoes[] = [];
    for (const aula of ordenada) {
      const anterior = atual[atual.length - 1];
      const sequencial = !!anterior && !!anterior.horaFim && !!aula.horaInicio && anterior.horaFim === aula.horaInicio;
      if (!sequencial && atual.length > 0) {
        blocos.push(atual);
        atual = [];
      }
      atual.push(aula);
    }
    if (atual.length > 0) blocos.push(atual);
  }

  for (const bloco of blocos) {
    const primeira = bloco[0];
    const dataFormatada = new Date(primeira.data).toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    });
    const usaWhatsapp = whatsappConfiguradoEmpresa(primeira.empresa);

    try {
      if (usaWhatsapp && primeira.aluno.telefoneResponsavel) {
        const numero = formatarWhatsapp(primeira.aluno.telefoneResponsavel);
        const mensagem = montarMensagemAulaWhatsapp(bloco, primeira.empresa.nome, dataFormatada);
        const envio = await enviarWhatsapp(numero, mensagem, primeira.empresa);

        await Promise.all(bloco.map((aula) =>
          prisma.notificacaoAula.upsert({
            where: { agendaAulaId: aula.id },
            update: { enviada: envio.ok, whatsapp: numero },
            create: { empresaId: aula.empresaId, agendaAulaId: aula.id, enviada: envio.ok, whatsapp: numero },
          })
        ));

        if (envio.ok) resultado.enviadas++;
        else resultado.erros.push(`${primeira.aluno.nome} (${numero}): ${envio.erro}`);
      } else if (!usaWhatsapp && primeira.aluno.emailResponsavel) {
        const emailResponsavel = primeira.aluno.emailResponsavel;
        const dados = montarDadosAulaEmail(bloco, primeira.empresa.nome, dataFormatada);
        const envio = await enviarEmailAula({ ...dados, emailResponsavel }, primeira.empresa);

        await Promise.all(bloco.map((aula) =>
          prisma.notificacaoAula.upsert({
            where: { agendaAulaId: aula.id },
            update: { emailEnviado: envio.ok, email: emailResponsavel },
            create: { empresaId: aula.empresaId, agendaAulaId: aula.id, emailEnviado: envio.ok, email: emailResponsavel },
          })
        ));

        if (envio.ok) resultado.enviadas++;
        else resultado.erros.push(`${primeira.aluno.nome} (${emailResponsavel}): ${envio.erro}`);
      } else {
        resultado.erros.push(
          usaWhatsapp
            ? `${primeira.aluno.nome}: sem telefone do responsável cadastrado`
            : `${primeira.aluno.nome}: WhatsApp não configurado e sem e-mail do responsável cadastrado`
        );
      }
    } catch (err) {
      resultado.erros.push(`${primeira.aluno.nome}: ${String(err)}`);
    }
  }

  return resultado;
}
