const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function ambiente(opcoes = {}) {
  const registros = new Set(['alvo', 'preservar']);
  const chamadas = [];
  const modulo = { exports: {} };
  const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/api/plataforma/inscricoes-teste/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(codigo, {
    exports: modulo.exports, module: modulo, Response, Date,
    require: (nome) => {
      if (nome === 'next/server') return { NextResponse: { json: (dados, init) => Response.json(dados, init) } };
      if (nome === '@/lib/plataforma') return { requirePlataforma: async () => opcoes.naoAutorizado ? null : { user: { perfil: 'PLATAFORMA' } } };
      if (nome === '@/lib/prisma') return { prisma: { inscricaoTeste: { deleteMany: async ({ where }) => {
        chamadas.push(where);
        assert.equal(Object.keys(where).length, 1);
        if (opcoes.falhaBanco) throw Error('Detalhe privado da conexão');
        return { count: registros.delete(where.id) ? 1 : 0 };
      } } } };
      throw Error('Dependência inesperada: ' + nome);
    },
  });
  async function excluir(dados = { id: 'alvo', confirmacao: true }, extras = {}) {
    const req = new Request('https://eg.example/api/plataforma/inscricoes-teste', {
      method: 'DELETE', headers: { Origin: 'https://eg.example', 'Content-Type': 'application/json', ...extras },
      body: typeof dados === 'string' ? dados : JSON.stringify(dados),
    });
    req.nextUrl = new URL(req.url);
    return modulo.exports.DELETE(req);
  }
  return { excluir, chamadas, registros };
}

test('exclui somente o ID confirmado e preserva as demais inscrições', async () => {
  const a = ambiente();
  const r = await a.excluir();
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  assert.equal(a.chamadas[0].id, 'alvo');
  assert.ok(a.registros.has('preservar'));
  assert.ok(!a.registros.has('alvo'));
  assert.equal((await a.excluir()).status, 404);
});

test('recusa sessão não autorizada e origem externa antes de acessar o banco', async () => {
  const semPermissao = ambiente({ naoAutorizado: true });
  assert.equal((await semPermissao.excluir()).status, 403);
  assert.equal(semPermissao.chamadas.length, 0);
  const a = ambiente();
  assert.equal((await a.excluir(undefined, { Origin: 'https://site-externo.invalid' })).status, 403);
  assert.equal(a.chamadas.length, 0);
});

test('exige ID válido e confirmação explícita', async () => {
  const a = ambiente();
  for (const dados of [{}, { id: 'alvo' }, { id: 'alvo', confirmacao: false }, { id: 'alvo', confirmacao: 'true' }, { id: '', confirmacao: true }, { id: ' ', confirmacao: true }, { id: 'a'.repeat(101), confirmacao: true }, { id: 1, confirmacao: true }, 'json inválido']) {
    assert.equal((await a.excluir(dados)).status, 400);
  }
  assert.equal(a.chamadas.length, 0);
  assert.ok(a.registros.has('alvo'));
});

test('limita requisição e trata falha do banco sem expor detalhes privados', async () => {
  const a = ambiente();
  assert.equal((await a.excluir(undefined, { 'Content-Length': '1025' })).status, 413);
  assert.equal(a.chamadas.length, 0);
  const falha = ambiente({ falhaBanco: true });
  const r = await falha.excluir();
  assert.equal(r.status, 503);
  assert.ok(!(await r.text()).includes('Detalhe privado'));
  assert.ok(falha.registros.has('alvo'));
});
