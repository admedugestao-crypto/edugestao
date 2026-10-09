const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function carregarMiddleware() {
  const modulo = { exports: {} };
  const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/middleware.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const dependencias = {
    'next/server': { NextResponse: {
      next: () => ({ status: 200 }),
      redirect: (url) => ({ status: 307, destino: url.pathname }),
    } },
    'next-auth/jwt': { getToken: async () => null },
    '@/lib/plataformaCookie': { PLATAFORMA_COOKIE: 'plataforma' },
  };
  vm.runInNewContext(codigo, {
    module: modulo, exports: modulo.exports, URL, process,
    require: (id) => {
      if (!(id in dependencias)) throw new Error(`Dependência inesperada: ${id}`);
      return dependencias[id];
    },
  });
  return modulo.exports.middleware;
}

for (const [caminho, status, destino] of [
  ['/logo-edugestao-v2.png', 200, undefined],
  ['/api/alunos', 307, '/login'],
  ['/logo-edugestao-v2.png/privado', 307, '/login'],
]) {
  test(`Acesso sem sessão: ${caminho}`, async () => {
    const url = new URL(caminho, 'https://edugestao.test');
    const resposta = await carregarMiddleware()({ nextUrl: url, url: url.href });
    assert.equal(resposta.status, status);
    assert.equal(resposta.destino, destino);
  });
}
