const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const file = path.resolve(__dirname, '../src/app/dashboard/alunos/[id]/imprimir/ImprimirAlunoClient.tsx');
const code = esbuild.transformSync(fs.readFileSync(file, 'utf8'), {
  loader: 'tsx', format: 'cjs', jsx: 'automatic',
}).code;
const mod = { exports: {} };
const mocks = {
  'next/navigation': { useRouter: () => ({ back() {} }) },
  'next/image': { __esModule: true, default: () => null },
  'lucide-react': { ArrowLeft: () => null, Printer: () => null },
};
vm.runInNewContext('(function(require,module,exports){' + code + '})', { Date })(
  id => id in mocks ? mocks[id] : require(id), mod, mod.exports,
);
const Ficha = mod.exports.default;
test('Ficha preserva nascimento civil em fusos brasileiros e extremos', () => {
  const original = process.env.TZ;
  try {
    for (const tz of ['America/Sao_Paulo', 'America/Manaus', 'Pacific/Honolulu', 'Pacific/Kiritimati']) {
      process.env.TZ = tz;
      for (const [iso, expected] of [['2016-01-15T00:00:00.000Z', '15/01/2016'], ['2020-03-01T00:00:00.000Z', '01/03/2020']]) {
        const html = renderToStaticMarkup(React.createElement(Ficha, {
          aluno: { id: 'teste', nome: 'Aluno fictício', dataNascimento: iso, status: 'ATIVO', unidade: { nome: 'Unidade', escola: { nome: 'Escola' } }, materias: [] },
        }));
        assert.ok(html.includes(expected), `${tz}: esperado ${expected}`);
      }
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
