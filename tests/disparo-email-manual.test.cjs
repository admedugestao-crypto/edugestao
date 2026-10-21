const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const esbuild = require('esbuild');
function carregar(arquivo, mocks) {
  const mod = { exports: {} };
  const code = esbuild.transformSync(fs.readFileSync(arquivo, 'utf8'), { loader: 'ts', format: 'cjs' }).code;
  vm.runInNewContext('(function(require,module,exports){' + code + '})', { Date, Intl, console })(id => {
    if (!(id in mocks)) throw new Error('Dependência inesperada: ' + id);
    return mocks[id];
  }, mod, mod.exports);
  return mod.exports;
}
function preparar({ scope = { empresaId: 'empresa-A', isAdmin: true }, pausado = false, conteudosPausados = false, falha = false } = {}) {
  let enviados = new Set(['silvia', 'lorena']);
  const registros = [
    { id: 'antonela', empresaId: 'empresa-A', planejado: false, hoje: true, realizada: true },
    { id: 'laura', empresaId: 'empresa-A', planejado: false, hoje: true, realizada: true },
    { id: 'silvia', empresaId: 'empresa-A', planejado: false, hoje: true, realizada: true },
    { id: 'lorena', empresaId: 'empresa-A', planejado: false, hoje: true, realizada: true },
    { id: 'outra-empresa', empresaId: 'empresa-B', planejado: false, hoje: true, realizada: true },
    { id: 'planejado', empresaId: 'empresa-A', planejado: true, hoje: true, realizada: true },
    { id: 'antigo', empresaId: 'empresa-A', planejado: false, hoje: false, realizada: true },
    { id: 'aula-pendente', empresaId: 'empresa-A', planejado: false, hoje: true, realizada: false },
  ];
  const chamadas = [];
  let filtro;
  function pendentes(where) {
    assert.equal(where.empresaId, 'empresa-A');
    assert.equal(where.aula.is.empresaId, 'empresa-A');
    assert.equal(where.aula.is.status, 'REALIZADA');
    assert.equal(where.planejado, false);
    assert.equal(where.data.lt - where.data.gte, 86400000);
    assert.equal(where.data.gte.getUTCHours(), 0);
    assert.equal(where.OR[0].notificacao.is, null);
    assert.equal(where.OR[1].notificacao.is.enviada, false);
    return registros.filter(r => r.empresaId === where.empresaId && !r.planejado && r.hoje && r.realizada && !enviados.has(r.id));
  }
  const api = carregar('src/app/api/notificacoes/disparar-email/route.ts', {
    'next/server': { NextResponse: { json: (body, opts) => ({ body, status: opts?.status ?? 200 }) } },
    '@/lib/tenant': { getSessionScope: async () => scope },
    '@/lib/prisma': { prisma: {
      empresa: { findUnique: async () => ({ ativo: true, emailPausado: pausado, alertasConteudoPausados: conteudosPausados }) },
      conteudo: {
        findMany: async ({ where }) => { filtro = where; return pendentes(where).map(r => ({ id: r.id, aluno: { nome: r.id } })); },
        count: async ({ where }) => pendentes(where).length,
      },
    } },
    '@/lib/notificacoes': {
      enviarNotificacaoConteudoMinistrado: async id => {
        chamadas.push(id);
        if (falha && id === 'laura') return { ok: false, erro: 'Falha simulada' };
        enviados.add(id); return { ok: true };
      },
      processarNotificacoesEmail: async empresaId => { assert.equal(empresaId, 'empresa-A'); return { enviadas: 0, erros: [] }; },
    },
  });
  return { executar: api.POST, chamadas, filtro: () => filtro };
}
test('recupera Antonela e Laura sem reenviar Silvia e Lorena nem alcançar outra empresa', async () => {
  const c = preparar();
  const r = await c.executar();
  assert.equal(r.status, 200); assert.equal(r.body.conteudos.enviadas, 2);
  assert.deepEqual(c.chamadas, ['antonela', 'laura']);
  const repetido = await c.executar();
  assert.equal(repetido.body.conteudos.enviadas, 0); assert.equal(c.chamadas.length, 2);
});
test('falha de um responsável aparece no resultado sem impedir os demais', async () => {
  const c = preparar({ falha: true }); const r = await c.executar();
  assert.equal(r.body.conteudos.enviadas, 1);
  assert.match(r.body.conteudos.erros[0], /laura: Falha simulada/);
});
test('sem sessão ou sem perfil administrador não dispara mensagens', async () => {
  for (const scope of [null, { empresaId: 'empresa-A', isAdmin: false }]) {
    const c = preparar({ scope }); const r = await c.executar();
    assert.equal(r.status, scope ? 403 : 401); assert.equal(c.chamadas.length, 0);
  }
});
test('respeita pausa geral e pausa de conteúdo', async () => {
  const geral = preparar({ pausado: true }); assert.equal((await geral.executar()).status, 423);
  assert.equal(geral.chamadas.length, 0);
  const assunto = preparar({ conteudosPausados: true });
  assert.equal((await assunto.executar()).body.conteudos.enviadas, 0); assert.equal(assunto.chamadas.length, 0);
});
test('helper impede envio repetido mesmo após seleção antiga de pendentes', async () => {
  let envios = 0, execucoes = 0;
  const tx = { $executeRaw: async () => { execucoes++; }, notificacaoConteudo: { findUnique: async () => ({ enviada: true }) } };
  const lib = carregar('src/lib/notificacoes.ts', {
    './prisma': { prisma: { $transaction: async cb => cb(tx) } },
    './email': { enviarEmailConteudoMinistrado: async () => { envios++; } },
    './envUtil': {},
  });
  const r = await lib.enviarNotificacaoConteudoMinistrado('já-enviado');
  assert.equal(r.ignorado, true); assert.equal(envios, 0); assert.equal(execucoes, 1);
});
test('retorno visual distingue quantidade enviada, falha e pendências', () => {
  const { resumirDisparoEmail } = carregar('src/lib/resultadoDisparoEmail.ts', {});
  const r = resumirDisparoEmail({ conteudos: { enviadas: 1, erros: ['Laura: erro simulado'] }, email: { enviadas: 0, erros: [] } });
  assert.equal(r.ok, false); assert.match(r.txt, /1 e-mail/); assert.match(r.txt, /Laura: erro simulado/);
});

test('duas solicitações simultâneas para o mesmo conteúdo resultam em um único envio', async () => {
  let enviado = false, envios = 0, fila = Promise.resolve();
  const tx = {
    $executeRaw: async () => {},
    conteudo: { findUnique: async () => ({
      id: 'conteudo', empresaId: 'empresa', planejado: false,
      aluno: { nome: 'Aluno de teste', emailResponsavel: 'teste@example.invalid' },
      materia: null, aula: null, topico: 'Conteúdo de teste', data: new Date(),
      empresa: { nome: 'Empresa de teste', emailPausado: false, alertasConteudoPausados: false },
    }) },
    notificacaoConteudo: {
      findUnique: async () => enviado ? { enviada: true } : null,
      upsert: async ({ create }) => { enviado = create.enviada; },
    },
  };
  const lib = carregar('src/lib/notificacoes.ts', {
    './prisma': { prisma: { $transaction: cb => {
      const resultado = fila.then(() => cb(tx)); fila = resultado.catch(() => {}); return resultado;
    } } },
    './email': { emailConfigurado: () => true, enviarEmailConteudoMinistrado: async () => { envios++; return { ok: true }; } },
    './envUtil': {},
  });
  const resultados = await Promise.all([lib.enviarNotificacaoConteudoMinistrado('conteudo'), lib.enviarNotificacaoConteudoMinistrado('conteudo')]);
  assert.equal(envios, 1); assert.equal(resultados.filter(r => r.ignorado).length, 1);
});
