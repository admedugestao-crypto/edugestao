const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function carregar(arquivo, dependencias = {}, extras = {}) {
  const modulo = { exports: {} };
  const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', arquivo), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(codigo, { exports: modulo.exports, module: modulo, Response, console: { warn() {} }, ...extras, require(nome) {
    if (nome in dependencias) return dependencias[nome];
    throw Error('Dependência inesperada: ' + nome);
  } });
  return modulo.exports;
}
const diagnostico = carregar('lib/diagnosticoSmtp.ts');

test('classifica falhas sem devolver credenciais ou a resposta bruta do provedor', () => {
  for (const [code, categoria] of [['EAUTH', 'AUTENTICACAO'], ['ETIMEDOUT', 'TEMPO_ESGOTADO'], ['EDNS', 'DNS'], ['ENOTFOUND', 'DNS'], ['ETLS', 'TLS'], ['CERT_HAS_EXPIRED', 'TLS'], ['ESOCKET', 'CONEXAO'], ['ECONNREFUSED', 'CONEXAO'], ['desconhecido', 'FALHA_NAO_IDENTIFICADA']]) {
    const resultado = diagnostico.diagnosticarSmtp({ code, message: 'SEGREDO', response: 'SEGREDO', password: 'SEGREDO' }, 'smtp');
    assert.equal(resultado.codigo, 'SMTP_' + categoria);
    assert.ok(!JSON.stringify(resultado).includes('SEGREDO'));
  }
  assert.equal(diagnostico.diagnosticarSmtp({ responseCode: 535 }, 'smtp').codigo, 'SMTP_AUTENTICACAO');
  assert.equal(diagnostico.diagnosticarSmtp(null, 'smtp').codigo, 'SMTP_FALHA_NAO_IDENTIFICADA');
});

test('distingue banco indisponível, configuração ausente e senha ilegível', () => {
  assert.equal(diagnostico.diagnosticarSmtp({ code: 'P1001' }, 'configuracao').codigo, 'SMTP_CONFIGURACAO_INDISPONIVEL');
  for (const code of ['SMTP_SEM_CONFIGURACAO', 'SMTP_CREDENCIAL_ILEGIVEL']) assert.equal(diagnostico.diagnosticarSmtp({ code }, 'configuracao').codigo, code);
});

function rota(opcoes = {}) {
  let verificacoes = 0, fechamentos = 0;
  const api = carregar('app/api/plataforma/parametrizacao-geral/route.ts', {
    'next/server': { NextResponse: { json: (dados, init) => Response.json(dados, init) } },
    '@/lib/plataforma': { requirePlataforma: async () => !opcoes.semSessao },
    '@/lib/prisma': {}, '@/lib/parametrizacaoEmail': {},
    '@/lib/diagnosticoSmtp': diagnostico,
    '@/lib/emailPlataforma': {
      obterEmailPlataforma: async () => { if (opcoes.configuracao) throw opcoes.configuracao; return {}; },
      transporteEmailPlataforma: () => ({ verify: async () => { verificacoes++; if (opcoes.smtp) throw opcoes.smtp; }, close: () => { fechamentos++; } }),
    },
  });
  return { executar: () => api.POST({ nextUrl: new URL('https://eg.example'), headers: new Headers({ origin: opcoes.origem || 'https://eg.example' }) }), contadores: () => ({ verificacoes, fechamentos }) };
}

test('rota verifica e fecha a conexão sem enviar mensagens', async () => {
  const a = rota(); const r = await a.executar();
  assert.equal(r.status, 200);
  assert.match((await r.json()).mensagem, /Nenhum e-mail foi enviado/);
  assert.deepEqual(a.contadores(), { verificacoes: 1, fechamentos: 1 });
});

test('rota devolve diagnóstico sanitizado e mantém controle de acesso', async () => {
  for (const opcoes of [{ semSessao: true }, { origem: 'https://externo.invalid' }]) {
    const a = rota(opcoes); assert.equal((await a.executar()).status, 403); assert.equal(a.contadores().verificacoes, 0);
  }
  for (const opcoes of [{ configuracao: { code: 'SMTP_CREDENCIAL_ILEGIVEL', message: 'SEGREDO' } }, { smtp: { code: 'EAUTH', response: 'SEGREDO' } }]) {
    const a = rota(opcoes); const r = await a.executar(); const dados = await r.json();
    assert.equal(r.status, 502); assert.ok(dados.codigo.startsWith('SMTP_')); assert.ok(!JSON.stringify(dados).includes('SEGREDO'));
    assert.equal(r.headers.get('cache-control'), 'no-store');
    if (opcoes.smtp) assert.equal(a.contadores().fechamentos, 1);
  }
});

test('serviço identifica ausência de configuração e erro ao decifrar sem vazar segredo', async () => {
  for (const existe of [false, true]) {
    const servico = carregar('lib/emailPlataforma.ts', {
      nodemailer: {}, '@/lib/emailConfirmacaoInscricao': {},
      '@/lib/prisma': { prisma: { parametrizacaoPlataforma: { findUnique: async () => existe ? { emailSenhaCifrada: 'SEGREDO' } : null } } },
      '@/lib/parametrizacaoEmail': { decifrarSenhaEmail() { throw Error('SEGREDO'); } },
    }, { process: { env: {} } });
    await assert.rejects(servico.obterEmailPlataforma(), (erro) => erro.code === (existe ? 'SMTP_CREDENCIAL_ILEGIVEL' : 'SMTP_SEM_CONFIGURACAO') && !erro.message.includes('SEGREDO'));
  }
});
