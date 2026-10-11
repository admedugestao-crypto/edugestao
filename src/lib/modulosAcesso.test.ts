import assert from "node:assert/strict";
import { test } from "node:test";
import { moduloDaRota } from "./modulosAcesso";

test("agrupa início e detalhes pelo módulo, em web e mobile", () => {
  assert.equal(moduloDaRota("/dashboard"), "inicio");
  assert.equal(moduloDaRota("/m"), "inicio");
  assert.equal(moduloDaRota("/dashboard/alunos/123/editar"), "alunos");
  assert.equal(moduloDaRota("/m/agenda"), "agenda");
  assert.equal(moduloDaRota("/v2/avaliacoes"), "avaliacoes");
  assert.equal(moduloDaRota("/v2/alunos/123"), "alunos");
  assert.equal(moduloDaRota("/dashboard/notificacoes-email"), "notificacoes-email");
});

test("exclui autenticação, plataforma, APIs e módulos desconhecidos", () => {
  for (const rota of ["/login", "/plataforma/empresas", "/api/alunos", "/mobile/agenda", "/dashboard/desconhecido", "/m/__proto__", "/m/constructor"]) {
    assert.equal(moduloDaRota(rota), null, rota);
  }
});
