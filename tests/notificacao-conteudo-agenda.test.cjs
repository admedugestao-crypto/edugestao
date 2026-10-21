const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const esbuild = require('esbuild');

function preparar({ planejado = true, envio = { ok: true }, empresa = 'empresa-teste', falhaTransacao = false } = {}) {
  const conteudo = { id: 'conteudo-teste', planejado };
  const aula = { id: 'aula-teste', empresaId: empresa, professoraId: 'professora-teste', status: 'AGENDADA' };
  const notificacoes = [];
  const prisma = {
    agendaAula: { findUnique: async () => ({ ...aula }), update: async ({ data }) => Object.assign(aula, data) },
    conteudo: {
      findUnique: async () => ({ ...conteudo }),
      update: async ({ data }) => Object.assign(conteudo, data),
      updateMany: async ({ where, data }) => {
        if (conteudo.planejado !== where.planejado) return { count: 0 };
        Object.assign(conteudo, data); return { count: 1 };
      },
    },
    $transaction: async (executar) => {
      if (falhaTransacao) throw new Error('Falha simulada na transação');
      return executar(prisma);
    },
  };
  const mocks = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/prisma': { prisma },
    '@/lib/tenant': { getSessionScope: async () => ({ empresaId: 'empresa-teste', isAdmin: true }) },
    '@/lib/permissions': { podeAcessarProfessora: () => true },
    '@/lib/entityIds': {},
    '@/lib/motorCobranca': { gerarPagamentoAula: async () => ({ semCobranca: true }) },
    '@/lib/notificacoes': { enviarNotificacaoConteudoMinistrado: async (id) => { notificacoes.push(id); return envio; } },
  };
  const mod = { exports: {} };
  const codigo = esbuild.transformSync(fs.readFileSync('src/app/api/agenda/[id]/route.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code;
  vm.runInNewContext('(function(require,module,exports){' + codigo + '})', { Date, console: { error() {}, warn() {} } })(id => {
    if (!(id in mocks)) throw new Error('Dependência não simulada: ' + id);
    return mocks[id];
  }, mod, mod.exports);
  return { notificacoes, executar: () => mod.exports.PATCH({ json: async () => ({ status: 'REALIZADA' }) }, { params: Promise.resolve({ id: aula.id }) }) };
}

test('realizar pela Agenda notifica o conteúdo convertido de planejado', async () => {
  const c = preparar();
  assert.equal((await c.executar()).status, 200);
  assert.deepEqual(c.notificacoes, ['conteudo-teste']);
  await c.executar();
  assert.equal(c.notificacoes.length, 1, 'repetir a atualização não duplica o e-mail');
});
test('conteúdo já ministrado não dispara novo e-mail pela Agenda', async () => {
  const c = preparar({ planejado: false });
  assert.equal((await c.executar()).status, 200);
  assert.equal(c.notificacoes.length, 0);
});
test('falha de envio preserva a aula realizada e retorna um aviso', async () => {
  const c = preparar({ envio: { ok: false, erro: 'Falha SMTP simulada' } });
  const resposta = await c.executar();
  assert.equal(resposta.status, 200);
  assert.match(resposta.body.avisoEmail, /Falha SMTP simulada/);
});
test('conteúdo de outra empresa nunca é convertido nem notificado', async () => {
  const c = preparar({ empresa: 'outra-empresa' });
  assert.equal((await c.executar()).status, 404);
  assert.equal(c.notificacoes.length, 0);
});
test('falha ao salvar a transação não envia e-mail', async () => {
  const c = preparar({ falhaTransacao: true });
  await assert.rejects(c.executar, /Falha simulada/);
  assert.equal(c.notificacoes.length, 0);
});
