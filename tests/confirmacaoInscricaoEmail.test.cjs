const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const inscricao = require('../src/lib/inscricaoTeste.ts');

function carregar(arquivo, dependencias, extras = {}) {
  const fonte = fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8');
  const codigo = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const modulo = { exports: {} };
  const contexto = { module: modulo, exports: modulo.exports, require: (nome) => nome in dependencias ? dependencias[nome] : require(nome), Buffer, Response, Request, URL, console, process: { env: { NEXTAUTH_SECRET: 'segredo-de-teste' } }, ...extras };
  vm.runInNewContext(codigo, contexto, { filename: arquivo });
  return modulo.exports;
}

const dados = { nome: 'Professora de Teste', email: 'professora@example.com', whatsapp: '31999990000', materias: 'Matemática', quantidadeAlunos: 12, organizacao: 'Agenda', dificuldade: 'Organizar horários', disponibilidade: true, consentimento: true, site: '' };

function ambiente(opcoes = {}) {
  const chamadas = [], tarefas = [], logs = [];
  const tx = {
    $executeRaw: async () => {},
    inscricaoTeste: {
      count: async () => opcoes.limite ? 5 : 0,
      findFirst: async () => opcoes.duplicada ? { id: 'existente' } : null,
      create: async () => { chamadas.push('gravar'); return { id: 'nova', nome: dados.nome, email: dados.email }; },
    },
  };
  const rota = carregar('src/app/api/inscricao-teste/route.ts', {
    'next/server': { NextResponse: { json: (json, init) => Response.json(json, init) }, after: (tarefa) => { chamadas.push('agendar'); tarefas.push(tarefa); } },
    '@/lib/prisma': { prisma: { $transaction: async (funcao) => { if (opcoes.falhaBanco) throw Error('Falha simulada'); const r = await funcao(tx); chamadas.push('commit'); return r; } } },
    '@/lib/inscricaoTeste': inscricao,
    '@/lib/emailPlataforma': { enviarConfirmacaoInscricao: async (destino) => { chamadas.push({ enviar: destino }); if (opcoes.falhaEmail) throw Object.assign(new Error('texto sigiloso do provedor'), { code: 'EAUTH' }); } },
  }, { console: { error: (...args) => logs.push(args) } });
  const requisicao = (body = dados) => {
    const req = new Request('https://eg.example/inscricao', { method: 'POST', headers: { origin: 'https://eg.example', 'content-type': 'application/json' }, body: JSON.stringify(body) });
    req.nextUrl = new URL(req.url);
    return rota.POST(req);
  };
  return { chamadas, tarefas, logs, requisicao };
}

test('agenda uma confirmação após o commit e responde sem aguardar o SMTP', async () => {
  const a = ambiente();
  const r = await a.requisicao();
  assert.equal(r.status, 201);
  assert.deepEqual(a.chamadas, ['gravar', 'commit', 'agendar']);
  assert.equal(a.tarefas.length, 1);
  await a.tarefas[0]();
  assert.equal(a.chamadas[3].enviar.email, dados.email);
  assert.equal(a.chamadas[3].enviar.id, 'nova');
});

test('não envia confirmação para duplicata, honeypot, limite ou gravação rejeitada', async () => {
  for (const [opcoes, body, status] of [[{ duplicada: true }, dados, 201], [{}, { ...dados, site: 'spam' }, 201], [{ limite: true }, dados, 429], [{ falhaBanco: true }, dados, 503], [{}, { ...dados, consentimento: false }, 400]]) {
    const a = ambiente(opcoes);
    assert.equal((await a.requisicao(body)).status, status);
    assert.equal(a.tarefas.length, 0);
  }
});

test('falha SMTP mantém sucesso da inscrição e não vaza mensagem do provedor no log', async () => {
  const a = ambiente({ falhaEmail: true });
  const r = await a.requisicao();
  assert.equal(r.status, 201);
  await assert.doesNotReject(a.tarefas[0]);
  assert.ok(JSON.stringify(a.logs).includes('EAUTH'));
  assert.ok(!JSON.stringify(a.logs).includes('texto sigiloso'));
  assert.ok(!JSON.stringify(a.logs).includes(dados.email));
});

test('usa destinatário da inscrição e remetente dos parâmetros gerais, fechando o transporte', async () => {
  const enviados = [];
  let fechou = false;
  const template = carregar('src/lib/emailConfirmacaoInscricao.ts', { './inscricaoTeste': inscricao });
  const servico = carregar('src/lib/emailPlataforma.ts', {
    nodemailer: { createTransport: (config) => { assert.equal(config.auth.pass, 'senha-decifrada'); return { sendMail: async (email) => enviados.push(email), close: () => { fechou = true; } }; } },
    '@/lib/prisma': { prisma: { parametrizacaoPlataforma: { findUnique: async () => ({ emailHost: 'smtp.example.com', emailPort: 587, emailUser: 'usuario@example.com', emailFrom: 'remetente@example.com', emailSenhaCifrada: 'cifrada' }) } } },
    '@/lib/parametrizacaoEmail': { decifrarSenhaEmail: () => 'senha-decifrada' },
    '@/lib/emailConfirmacaoInscricao': template,
  });
  await servico.enviarConfirmacaoInscricao(dados);
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].from, 'remetente@example.com');
  assert.equal(enviados[0].to, dados.email);
  assert.ok(enviados[0].text.includes('não representa aprovação'));
  assert.ok(enviados[0].text.includes('60 dias'));
  assert.ok(enviados[0].text.includes('12 meses'));
  assert.ok(fechou);
});
