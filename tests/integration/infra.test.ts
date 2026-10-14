import "./seguranca";
import assert from "node:assert/strict";
import test, { after } from "node:test";
import { enviarEmailAula } from "@/lib/email";
import { enviarWhatsapp } from "@/lib/notificacoes";
import { prisma } from "@/lib/prisma";

const mailpitUrl = process.env.INTEGRATION_MAILPIT_URL ?? "http://localhost:8025";
const mockserverUrl = process.env.INTEGRATION_MOCKSERVER_URL ?? "http://localhost:1080";
const arquivosUrl = process.env.INTEGRATION_ARQUIVOS_URL!;

after(async () => { await prisma.$disconnect(); });

test("conecta ao PostgreSQL isolado", async () => {
  const resultado = await prisma.$queryRaw<{ resposta: number }[]>`SELECT 1 AS resposta`;
  assert.equal(resultado[0]?.resposta, 1);
});

test("captura e-mail no Mailpit sem entrega externa", async () => {
  const envio = await enviarEmailAula({
    nomeEmpresa: "EduGestão Integração",
    nomeResponsavel: "Responsável de teste",
    nomeAluno: "Aluno de teste",
    dataFormatada: "14/10/2026",
    aulas: [{ horario: "08:00", materia: "Matemática", professor: "Professora de teste" }],
    emailResponsavel: "responsavel.teste@integration.invalid",
  }, {
    emailHost: "mailpit",
    emailPort: "1025",
    emailUser: "integracao",
    emailPass: "integracao",
    emailFrom: "noreply@integration.invalid",
  });
  assert.equal(envio.ok, true, envio.erro);

  const resposta = await fetch(`${mailpitUrl}/api/v1/messages`);
  assert.equal(resposta.ok, true);
  assert.match(JSON.stringify(await resposta.json()), /responsavel\.teste@integration\.invalid/);
});

test("envia WhatsApp somente ao simulador Evolution", async () => {
  const envio = await enviarWhatsapp("5531999999999", "Mensagem de integração", {
    evolutionApiUrl: mockserverUrl,
    evolutionApiKey: "chave-integracao",
    evolutionApiInstance: "integracao",
  });
  assert.deepEqual(envio, { ok: true, provedor: "evolution" });
});

test("envia e recupera o conteúdo no simulador de arquivos", async () => {
  const url = `${arquivosUrl}/material-teste.pdf`;
  const conteudo = "%PDF-1.4\nMaterial fictício de integração";
  const envio = await fetch(url, { method: "PUT", body: conteudo });
  assert.equal(envio.status, 201);
  assert.equal(await (await fetch(url)).text(), conteudo);
});
