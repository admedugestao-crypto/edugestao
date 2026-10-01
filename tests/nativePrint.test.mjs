import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import esbuild from 'esbuild';

const source = esbuild.transformSync(fs.readFileSync(new URL('../src/lib/nativePrint.ts', import.meta.url), 'utf8'), {
  loader: 'ts', format: 'cjs',
}).code;

function load({ native = false, available = true, print = async () => {}, fonts = Promise.resolve() } = {}) {
  const events = [];
  const mod = { exports: {} };
  const core = {
    Capacitor: { isNativePlatform: () => native, isPluginAvailable: () => available },
    registerPlugin: name => {
      assert.equal(name, 'NativePrint');
      return { print: async () => { events.push('native'); await print(); } };
    },
  };
  vm.runInNewContext('(function(require,module,exports){' + source + '})', {
    window: { print() { events.push('browser'); } }, document: { fonts: { ready: fonts } },
  })(name => { assert.equal(name, '@capacitor/core'); return core; }, mod, mod.exports);
  return { printDocument: mod.exports.printDocument, events };
}

test('navegador mantém impressão padrão sem chamar serviço nativo', async () => {
  const app = load();
  await app.printDocument();
  assert.deepEqual(app.events, ['browser']);
});

test('app aguarda fontes e solicita impressão nativa sem usar window.print', async () => {
  let ready;
  const fonts = new Promise(resolve => { ready = resolve; });
  const app = load({ native: true, fonts });
  const request = app.printDocument();
  assert.deepEqual(app.events, []);
  ready();
  await request;
  assert.deepEqual(app.events, ['native']);
});

test('APK anterior sem plugin informa atualização em vez de falhar silenciosamente', async () => {
  const app = load({ native: true, available: false });
  await assert.rejects(app.printDocument(), /Atualize o aplicativo/);
  assert.deepEqual(app.events, []);
});

test('falha do serviço nativo chega ao chamador para exibir aviso', async () => {
  const app = load({ native: true, print: async () => { throw new Error('Serviço indisponível'); } });
  await assert.rejects(app.printDocument(), /Serviço indisponível/);
  assert.deepEqual(app.events, ['native']);
});
