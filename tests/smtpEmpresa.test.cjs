const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function carregar(arquivo, dependencias) {
  const modulo = { exports: {} };
  const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', arquivo), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(codigo, { exports: modulo.exports, module: modulo, console: { warn() {} }, require: (nome) => {
    if (!(nome in dependencias)) throw Error('Dependência inesperada: ' + nome);
    return dependencias[nome];
  } });
  return modulo.exports;
}
const diagnostico = carregar('lib/diagnosticoSmtp.ts', {});
function ambiente(opcoes = {}) {
  const chamadas = []; let fechamentos = 0;
  const api = carregar('app/api/plataforma/empresas/[id]/testar-smtp/route.ts', {
    'next/server': { NextResponse: { json: (dados, init) => Response.json(dados, init) } },
    '@/lib/plataforma': { requirePlataforma: async () => !opcoes.semSessao },
    '@/lib/diagnosticoSmtp': diagnostico,
    '@/lib/prisma': { prisma: { empresa: { findUnique: async ({ where, select }) => {
      chamadas.push(where.id); assert.equal(select.emailPass, true);
      if (opcoes.banco) throw Error('SEGREDO');
      return opcoes.ausente ? null : { emailHost: 'smtp.example.com', emailUser: 'usuario', emailPass: 'SEGREDO', emailPort: opcoes.porta ?? '587' };
    } } } },
    nodemailer: { createTransport(config) {
      assert.equal(config.auth.pass, 'SEGREDO'); assert.equal(config.port, Number(opcoes.porta ?? '587'));
      assert.equal(config.secure, opcoes.porta === '465'); assert.equal(config.requireTLS, opcoes.porta !== '465');
      return { verify: async () => { if (opcoes.falha) throw { code: 'EAUTH', response: 'SEGREDO' }; }, close: () => { fechamentos++; } };
    } },
  });
  return { executar: () => api.POST({ nextUrl: new URL('https://eg.example'), headers: new Headers({ origin: opcoes.origem || 'https://eg.example' }) }, { params: Promise.resolve({ id: 'empresa-alvo' }) }), chamadas, fechamentos: () => fechamentos };
}
test('usa somente a empresa solicitada e fecha conexão, em STARTTLS e TLS direto', async () => {
  for (const porta of ['587', '465']) {
    const a = ambiente({ porta }); const r = await a.executar();
    assert.equal(r.status, 200); assert.deepEqual(a.chamadas, ['empresa-alvo']); assert.equal(a.fechamentos(), 1);
    assert.ok(!(await r.text()).includes('SEGREDO')); assert.equal(r.headers.get('cache-control'), 'no-store');
  }
});
test('bloqueia sessão ausente e origem externa antes de consultar credenciais', async () => {
  for (const opcoes of [{ semSessao: true }, { origem: 'https://externo.invalid' }]) {
    const a = ambiente(opcoes); assert.equal((await a.executar()).status, 403); assert.equal(a.chamadas.length, 0);
  }
});
test('trata empresa inexistente, porta inválida e banco indisponível sem expor dados', async () => {
  for (const [opcoes, status] of [[{ ausente: true }, 404], [{ porta: 'invalida' }, 400], [{ banco: true }, 502]]) {
    const a = ambiente(opcoes); const r = await a.executar(); assert.equal(r.status, status); assert.ok(!(await r.text()).includes('SEGREDO')); assert.equal(a.fechamentos(), 0);
  }
});
test('devolve diagnóstico de autenticação sanitizado e fecha transporte na falha', async () => {
  const a = ambiente({ falha: true }); const r = await a.executar(); const dados = await r.json();
  assert.equal(r.status, 502); assert.equal(dados.codigo, 'SMTP_AUTENTICACAO'); assert.ok(!JSON.stringify(dados).includes('SEGREDO')); assert.equal(a.fechamentos(), 1);
});
