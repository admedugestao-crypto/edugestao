import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import esbuild from 'esbuild';

function load(file, imports) {
  const mod = { exports: {} };
  const code = esbuild.transformSync(fs.readFileSync(file, 'utf8'), {
    loader: file.endsWith('tsx') ? 'tsx' : 'ts', format: 'cjs', jsx: 'automatic',
  }).code;
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { Date, Number, Set })(name => {
    assert.ok(name in imports, `Unexpected dependency ${name}`);
    return imports[name];
  }, mod, mod.exports);
  return mod.exports;
}

const permissions = load('src/lib/permissions.ts', {});
const entityIds = load('src/lib/entityIds.ts', {});

function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === 'object' && 'in' in value) return value.in.includes(row[key]);
    if (value && typeof value === 'object') return !!row[key] && matches(row[key], value);
    return row[key] === value;
  });
}

function setup(empresaId = 'KCF', foreign = 'CRT', admin = true) {
  const scope = { empresaId, professoraId: 'prof', isAdmin: admin };
  const state = {
    aula: { id: 'aula', empresaId, professoraId: 'prof', alunoId: 'aluno', status: 'AGENDADA', materiaId: 'materia', aluno: { materias: [{ materiaId: 'materia' }] } },
    conteudo: { id: 'conteudo', empresaId, aulaId: null, alunoId: 'aluno', materiaId: 'materia', topico: 'Original', aluno: { professoraId: 'prof' } },
  };
  const alunos = [{ id: 'aluno', empresaId, professoraId: 'prof' }, { id: 'estrangeiro', empresaId: foreign, professoraId: 'prof-externo' }, { id: 'outro-prof', empresaId, professoraId: 'outro' }];
  const materias = [{ id: 'materia', empresaId }, { id: 'materia-estrangeira', empresaId: foreign }];
  let writes = 0;
  const update = row => async ({ data }) => {
    writes++;
    for (const [key, value] of Object.entries(data)) if (value !== undefined) row[key] = value;
    return structuredClone(row);
  };
  const prisma = {
    aluno: { findFirst: async ({ where }) => alunos.find(row => matches(row, where)) ?? null },
    materia: { findMany: async ({ where }) => materias.filter(row => matches(row, where)) },
    agendaAula: {
      findUnique: async () => structuredClone(state.aula),
      findFirst: async ({ where }) => matches(state.aula, where) ? structuredClone(state.aula) : null,
      update: update(state.aula),
    },
    conteudo: {
      findUnique: async ({ where }) => where.aulaId ? null : structuredClone(state.conteudo),
      update: update(state.conteudo),
    },
    agendaAulaMateria: { deleteMany: async () => { writes++; }, createMany: async () => { writes++; } },
    conteudoMateria: { deleteMany: async () => { writes++; } },
  };
  prisma.$transaction = async fn => fn(prisma);
  const imports = {
    'next/server': { NextResponse: { json: (body, opts) => ({ body, status: opts?.status ?? 200 }) } },
    '@/lib/prisma': { prisma }, '@/lib/tenant': { getSessionScope: async () => scope },
    '@/lib/permissions': permissions, '@/lib/entityIds': entityIds,
    '@/lib/conteudoAgenda': { validarAgenda: async () => ({ ok: true }) },
    '@/lib/motorCobranca': {},
  };
  return { state, writes: () => writes,
    agenda: load('src/app/api/agenda/[id]/route.ts', imports),
    conteudo: load('src/app/api/conteudos/[id]/route.ts', imports) };
}

const params = id => ({ params: Promise.resolve({ id }) });
const req = body => ({ json: async () => body });
for (const [owner, foreign] of [['KCF', 'CRT'], ['CRT', 'KCF']]) {
  for (const ids of [['materia-estrangeira'], ['materia', 'materia-estrangeira']]) {
    test(`${owner}: agenda rejeita matéria estrangeira antes de apagar vínculos (${ids.length} IDs)`, async () => {
      const app = setup(owner, foreign);
      const before = structuredClone(app.state);
      assert.equal((await app.agenda.PATCH(req({ materiaIds: ids }), params('aula'))).status, 404);
      assert.equal(app.writes(), 0);
      assert.deepEqual(app.state, before);
    });
  }
  test(`${owner}: matéria própria e seleção vazia continuam permitidas na agenda`, async () => {
    for (const materiaIds of [['materia'], []]) {
      const app = setup(owner, foreign);
      assert.equal((await app.agenda.PATCH(req({ materiaIds }), params('aula'))).status, 200);
      assert.equal(app.state.aula.materiaId, 'materia');
      assert.ok(app.writes() > 0);
    }
  });
  for (const body of [
    { alunoId: 'estrangeiro', materiaIds: ['materia'] },
    { alunoId: 'aluno', materiaIds: ['materia-estrangeira'] },
    { alunoId: 'aluno', materiaIds: ['materia', 'materia-estrangeira'] },
  ]) {
    test(`${owner}: conteúdo rejeita referências estrangeiras ${JSON.stringify(body)}`, async () => {
      const app = setup(owner, foreign);
      const before = structuredClone(app.state);
      const response = await app.conteudo.PUT(req({ ...body, data: '2026-10-02', planejado: true, topico: 'Alteração indevida' }), params('conteudo'));
      assert.equal(response.status, 404);
      assert.equal(app.writes(), 0);
      assert.deepEqual(app.state, before);
    });
  }
  test(`${owner}: edição de planejamento próprio continua permitida`, async () => {
    const app = setup(owner, foreign, false);
    const result = await app.conteudo.PUT(req({ alunoId: 'aluno', materiaIds: ['materia'], data: '2026-10-02', planejado: true, topico: 'Revisado' }), params('conteudo'));
    assert.equal(result.status, 200);
    assert.equal(app.state.conteudo.topico, 'Revisado');
  });
}

test('professor não reatribui conteúdo para aluno de outro professor da mesma empresa', async () => {
  const app = setup('KCF', 'CRT', false);
  assert.equal((await app.conteudo.PUT(req({ alunoId: 'outro-prof', materiaIds: [], planejado: true, data: '2026-10-02' }), params('conteudo'))).status, 404);
  assert.equal(app.writes(), 0);
});
test('conteúdo rejeita aula estrangeira/incompatível antes de apagar disciplinas', async () => {
  const app = setup();
  assert.equal((await app.conteudo.PUT(req({ alunoId: 'aluno', materiaIds: ['materia'], planejado: true, aulaIdEscolhido: 'aula-externa', data: '2026-10-02' }), params('conteudo'))).status, 404);
  assert.equal(app.writes(), 0);
});

function receipt(scope) {
  let queried = false;
  function payment(id, empresaId, professoraId, pago = true) {
    return { id, empresaId, pago, mes: 10, ano: 2026, parcela: 1, valorCobrado: 1, dataVencimento: '2026-10-02', dataPagamento: '2026-10-01', quantidadeAulas: 1,
      aluno: { empresaId, professoraId, nome: id, unidade: { nome: 'Unidade', escola: { nome: 'Escola' } }, professora: { usuario: { nome: 'Professor' } } } };
  }
  const rows = [payment('proprio', 'KCF', 'prof'), payment('proprio2', 'KCF', 'prof'), payment('estrangeiro', 'CRT', 'crt-prof'), payment('outro-prof', 'KCF', 'outro'), payment('pendente', 'KCF', 'prof', false)];
  const page = load('src/app/imprimir/recibo/page.tsx', {
    '@/lib/prisma': { prisma: { pagamento: { findMany: async ({ where }) => { queried = true; return rows.filter(row => matches(row, where)); } } } },
    '@/lib/tenant': { getSessionScope: async () => scope }, '@/lib/entityIds': entityIds,
    'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); } },
    './ReciboClient': { default: () => null },
    'react/jsx-runtime': { jsx: (component, props) => ({ component, props }) },
  }).default;
  return { run: ids => page({ searchParams: Promise.resolve({ ids }) }), queried: () => queried };
}
const adminScope = { empresaId: 'KCF', isAdmin: true, professoraId: 'prof' };
const profScope = { ...adminScope, isAdmin: false };
for (const ids of ['estrangeiro', 'proprio,estrangeiro']) {
  test(`recibo nega pagamento estrangeiro, inclusive seleção mista: ${ids}`, async () => {
    await assert.rejects(receipt(adminScope).run(ids), /NOT_FOUND/);
  });
}
test('recibo próprio individual e agrupado continuam disponíveis; IDs duplicados são normalizados', async () => {
  assert.equal((await receipt(profScope).run('proprio')).props.itens.length, 1);
  assert.equal((await receipt(profScope).run('proprio, proprio2,proprio')).props.itens.length, 2);
});
test('professor não imprime pagamento de outro professor da mesma empresa; admin pode', async () => {
  await assert.rejects(receipt(profScope).run('outro-prof'), /NOT_FOUND/);
  assert.equal((await receipt(adminScope).run('outro-prof')).props.itens.length, 1);
});
test('sem sessão não consulta pagamentos; sem professor não acessa recibo; pendente não é recibo', async () => {
  const app = receipt(null);
  await assert.rejects(app.run('proprio'), /NOT_FOUND/);
  assert.equal(app.queried(), false);
  await assert.rejects(receipt({ ...profScope, professoraId: null }).run('proprio'), /NOT_FOUND/);
  await assert.rejects(receipt(adminScope).run('pendente'), /NOT_FOUND/);
});

