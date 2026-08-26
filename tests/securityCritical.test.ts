import assert from "node:assert/strict";
import test from "node:test";
import { autorizarCron } from "../src/lib/cronAuth.ts";
import { normalizarIds, todosIdsEncontrados } from "../src/lib/entityIds.ts";
import { ocultarCredenciaisEmpresa } from "../src/lib/platformCredentials.ts";

test("cron falha fechado quando CRON_SECRET não está configurado", () => {
  const result = autorizarCron(new Headers(), undefined);
  assert.deepEqual(result, {
    ok: false,
    status: 503,
    erro: "Serviço de notificações não configurado.",
  });
});

test("cron rejeita credencial ausente ou incorreta", () => {
  assert.equal(autorizarCron(new Headers(), "segredo").ok, false);
  assert.equal(
    autorizarCron(new Headers({ authorization: "Bearer incorreto" }), "segredo").ok,
    false,
  );
});

test("cron aceita bearer ou x-cron-key válidos", () => {
  assert.deepEqual(
    autorizarCron(new Headers({ authorization: "Bearer segredo" }), "segredo"),
    { ok: true },
  );
  assert.deepEqual(
    autorizarCron(new Headers({ "x-cron-key": "segredo" }), "segredo"),
    { ok: true },
  );
});

test("normaliza IDs e elimina valores inválidos ou duplicados", () => {
  assert.deepEqual(normalizarIds([" materia-1 ", "materia-1", "", null, 1, "materia-2"]), [
    "materia-1",
    "materia-2",
  ]);
  assert.deepEqual(normalizarIds("materia-1"), []);
});

test("rejeita referências quando algum ID não pertence ao escopo consultado", () => {
  assert.equal(todosIdsEncontrados(["materia-1", "materia-2"], ["materia-1"]), false);
  assert.equal(todosIdsEncontrados(["materia-1"], ["materia-1", "materia-2"]), true);
  assert.equal(todosIdsEncontrados([], []), true);
});

test("API da plataforma não expõe credenciais das empresas", () => {
  const empresa = ocultarCredenciaisEmpresa({
    id: "empresa-1",
    fonnteToken: "token-secreto",
    evolutionApiKey: "api-key-secreta",
    emailPass: "senha-secreta",
  });

  assert.equal("fonnteToken" in empresa, false);
  assert.equal("evolutionApiKey" in empresa, false);
  assert.equal("emailPass" in empresa, false);
  assert.deepEqual(empresa, {
    id: "empresa-1",
    fonnteTokenConfigurado: true,
    evolutionApiKeyConfigurada: true,
    emailPassConfigurada: true,
  });
});
