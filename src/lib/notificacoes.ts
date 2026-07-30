import { prisma } from "./prisma";
import { enviarEmailProva, emailConfigurado } from "./email";

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

// Remove BOM (U+FEFF) e espaços que às vezes vêm junto ao colar a variável de
// ambiente no painel da Vercel — sem isso, fetch() lança TypeError ao usar o
// valor como header HTTP.
const BOM = String.fromCharCode(65279);
function limparEnv(v: string | undefined): string | undefined {
  if (!v) return v;
  const limpo = (v.startsWith(BOM) ? v.slice(BOM.length) : v).trim();
  return limpo || undefined;
}

// ── Envia via Fonnte ──────────────────────────────────────────────────────────
async function enviarViaFonnte(numero: string, mensagem: string): Promise<EnvioResultado> {
  const token = limparEnv(process.env.FONNTE_TOKEN);
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
  const url = limparEnv(process.env.EVOLUTION_API_URL);
  const apiKey = limparEnv(process.env.EVOLUTION_API_KEY);
  const instance = limparEnv(process.env.EVOLUTION_INSTANCE);
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

// ── Tenta, em cascata, os provedores de WhatsApp configurados ───────────────
// Fonnte, depois Evolution como fallback — para no primeiro que funcionar, e
// reporta o motivo real de cada falha (visível nos logs da função e na
// resposta da API). Z-API foi removido da cascata (assinatura da instância
// expirada — ver histórico de commits).
export async function enviarWhatsapp(numero: string, mensagem: string): Promise<EnvioResultado> {
  const tentativas = [enviarViaFonnte, enviarViaEvolutionAPI];
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
  const empresas = await prisma.empresa.findMany({ where: { ativo: true, whatsappPausado: false }, select: { id: true, nome: true } });

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

          const envio = await enviarWhatsapp(numero, mensagem);

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

  if (!emailConfigurado()) {
    resultado.erros.push("E-mail não configurado (EMAIL_HOST / EMAIL_USER / EMAIL_PASS ausentes).");
    return resultado;
  }

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const empresas = await prisma.empresa.findMany({ where: { ativo: true, emailPausado: false }, select: { id: true } });

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
          });

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
export async function processarNotificacoesAula(): Promise<{
  enviadas: number;
  erros: string[];
}> {
  const resultado = { enviadas: 0, erros: [] as string[] };
  const fonnteConfigurada = !!process.env.FONNTE_TOKEN;
  const evolutionConfigurada = !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE);

  if (!fonnteConfigurada && !evolutionConfigurada) return resultado;

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);
  const fimAmanha = new Date(amanha);
  fimAmanha.setHours(23, 59, 59, 999);

  // empresaId é redundante aqui (aula/notificacao já herdam da agenda), mas
  // deixa a query explícita e resistente a joins futuros.
  const aulas = await prisma.agendaAula.findMany({
    where: {
      data: { gte: amanha, lte: fimAmanha },
      status: "AGENDADA",
      aluno: { telefoneResponsavel: { not: null } },
      empresa: { whatsappPausado: false },
    },
    include: {
      aluno: true,
      professora: { include: { usuario: { select: { nome: true } } } },
      materia: true,
      notificacao: true,
      empresa: { select: { nome: true } },
    },
  });

  type AulaComRelacoes = (typeof aulas)[number];

  function horarioDe(aula: AulaComRelacoes): string {
    return aula.horaInicio
      ? aula.horaFim ? `${aula.horaInicio} – ${aula.horaFim}` : aula.horaInicio
      : "horário a confirmar";
  }

  function montarMensagemUnica(aula: AulaComRelacoes, dataFormatada: string): string {
    return [
      `📚 *${aula.empresa.nome} – Lembrete de Aula*`,
      ``,
      `Olá${aula.aluno.responsavel ? `, *${aula.aluno.responsavel}*` : ""}!`,
      ``,
      `⚠️ *Amanhã* a(o) *${aula.aluno.nome}* tem aula agendada:`,
      ``,
      ...(aula.materia ? [`📖 *Disciplina:* ${aula.materia.nome}`] : []),
      `📆 *Data:* ${dataFormatada}`,
      `🕐 *Horário:* ${horarioDe(aula)}`,
      `👩‍🏫 *Professor(a):* ${aula.professora.usuario.nome}`,
      ``,
      `_Mensagem automática de ${aula.empresa.nome} via EduGestão_`,
    ].join("\n");
  }

  // Aluno com 2+ aulas seguidas no mesmo dia (horaFim de uma bate com
  // horaInicio da próxima) recebe UMA mensagem só, listando cada aula — em
  // vez de uma mensagem separada por aula, que soa repetitivo pro responsável.
  function montarMensagemSequencia(bloco: AulaComRelacoes[], dataFormatada: string): string {
    const primeira = bloco[0];
    const linhasAulas = bloco.map((aula) =>
      `🕐 *${horarioDe(aula)}* — ${aula.materia ? aula.materia.nome : "matéria não definida"} (Prof. ${aula.professora.usuario.nome})`
    );
    return [
      `📚 *${primeira.empresa.nome} – Lembrete de Aula*`,
      ``,
      `Olá${primeira.aluno.responsavel ? `, *${primeira.aluno.responsavel}*` : ""}!`,
      ``,
      `⚠️ *Amanhã* a(o) *${primeira.aluno.nome}* tem ${bloco.length} aulas seguidas agendadas:`,
      ``,
      ...linhasAulas,
      ``,
      `📆 *Data:* ${dataFormatada}`,
      ``,
      `_Mensagem automática de ${primeira.empresa.nome} via EduGestão_`,
    ].join("\n");
  }

  const pendentes = aulas.filter((a) => !a.notificacao?.enviada);

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
    const numero = formatarWhatsapp(primeira.aluno.telefoneResponsavel!);
    const dataFormatada = new Date(primeira.data).toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    });
    const mensagem = bloco.length === 1
      ? montarMensagemUnica(primeira, dataFormatada)
      : montarMensagemSequencia(bloco, dataFormatada);

    try {
      const envio = await enviarWhatsapp(numero, mensagem);

      await Promise.all(bloco.map((aula) =>
        prisma.notificacaoAula.upsert({
          where: { agendaAulaId: aula.id },
          update: { enviada: envio.ok, whatsapp: numero },
          create: { empresaId: aula.empresaId, agendaAulaId: aula.id, enviada: envio.ok, whatsapp: numero },
        })
      ));

      if (envio.ok) resultado.enviadas++;
      else resultado.erros.push(`${primeira.aluno.nome} (${numero}): ${envio.erro}`);
    } catch (err) {
      resultado.erros.push(`${primeira.aluno.nome}: ${String(err)}`);
    }
  }

  return resultado;
}
