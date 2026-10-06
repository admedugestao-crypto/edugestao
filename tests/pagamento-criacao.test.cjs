const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const esbuild = require('esbuild');

function setup({ existing = [], tenant = true, admin = true, failure } = {}) {
  const rows = structuredClone(existing);
  const prisma = {
    aluno: { findFirst: async ({ where }) => tenant && where.empresaId === 'empresa' ? { id: 'aluno' } : null },
    pagamento: {
      create: async ({ data }) => {
        if (failure) throw failure;
        if (rows.some(p => ['alunoId', 'mes', 'ano', 'parcela'].every(k => p[k] === data[k]))) {
          throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
        }
        const row = { id: `p${rows.length}`, ...data };
        rows.push(row);
        return row;
      },
    },
  };
  function compile(path, imports) {
    const mod = { exports: {} };
    const code = esbuild.transformSync(fs.readFileSync(path, 'utf8'), { loader: 'ts', format: 'cjs' }).code;
    vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { Date, Number })(name => {
      if (!(name in imports)) throw Error(`Unexpected import: ${name}`);
      return imports[name];
    }, mod, mod.exports);
    return mod.exports;
  }
  const handler = compile('src/app/api/pagamentos/route.ts', {
    '@/lib/validarPagamento': compile('src/lib/validarPagamento.ts', {}),
    '@/lib/prisma': { prisma },
    '@/lib/tenant': { getSessionScope: async () => ({ empresaId: 'empresa' }) },
    '@/lib/permissions': { podeGerenciarFinanceiro: () => admin },
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
  }).POST;
  return { rows, post: body => handler({ json: async () => body }) };
}
const input = { alunoId: 'aluno', mes: 9, ano: 2026, parcela: 1, valorCobrado: 11, pago: false, dataVencimento: '2026-09-30', observacao: 'tentativa' };
for (const pago of [true, false]) {
  test(`duplicidade preserva integralmente parcela ${pago ? 'paga' : 'pendente'}`, async () => {
    const original = { ...input, id: 'original', valorCobrado: 10, pago, dataPagamento: pago ? '2026-09-22' : null, observacao: null, origemManual: false, aulas: ['aula'] };
    const app = setup({ existing: [original] });
    for (const submittedPaid of [false, true]) {
      const response = await app.post({ ...input, pago: submittedPaid });
      assert.equal(response.status, 409);
      assert.match(response.body.erro, /Já existe uma cobrança/);
      assert.deepEqual(app.rows, [original]);
    }
  });
}
test('nova parcela pode ser criada e duas tentativas concorrentes só criam uma', async () => {
  const app = setup();
  const results = await Promise.all([app.post(input), app.post(input)]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal(app.rows.length, 1);
  assert.equal(app.rows[0].origemManual, true);
  assert.equal((await app.post({ ...input, parcela: 2 })).status, 200);
  assert.equal(app.rows.length, 2);
});
test('mantém isolamento de empresa e permissão de administrador', async () => {
  for (const [options, status] of [[{ tenant: false }, 404], [{ admin: false }, 403]]) {
    const app = setup(options);
    assert.equal((await app.post(input)).status, status);
    assert.equal(app.rows.length, 0);
  }
});
test('falhas inesperadas não são confundidas com duplicidade', async () => {
  const failure = new Error('Database unavailable');
  await assert.rejects(setup({ failure }).post(input), error => error === failure);
});
