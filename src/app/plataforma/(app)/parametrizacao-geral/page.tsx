"use client";

import { useEffect, useState } from "react";

const vazio = { emailHost: "", emailPort: "587", emailUser: "", emailPass: "", emailFrom: "" };
const endpoint = "/api/plataforma/parametrizacao-geral";

export default function ParametrizacaoGeralPage() {
  const [campos, setCampos] = useState(vazio);
  const [carregando, setCarregando] = useState(true);
  const [indisponivel, setIndisponivel] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [senhaConfigurada, setSenhaConfigurada] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    const controle = new AbortController();
    async function carregar() {
      try {
        const resposta = await fetch(endpoint, { cache: "no-store", signal: controle.signal });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar a configuração.");
        if (dados.configuracao) setCampos({ ...vazio, emailHost: dados.configuracao.emailHost, emailUser: dados.configuracao.emailUser, emailPort: String(dados.configuracao.emailPort), emailFrom: dados.configuracao.emailFrom || "" });
        setSenhaConfigurada(dados.senhaConfigurada);
      } catch (falha) {
        if (controle.signal.aborted) return;
        setErro(falha instanceof Error ? falha.message : "Não foi possível carregar a configuração.");
        setIndisponivel(true);
      } finally { if (!controle.signal.aborted) setCarregando(false); }
    }
    void carregar();
    return () => controle.abort();
  }, []);

  function mudar(campo: keyof typeof vazio, valor: string) {
    setCampos((anterior) => ({ ...anterior, [campo]: valor }));
    setAlterado(true); setMensagem(""); setErro("");
  }

  async function executar(testar: boolean) {
    setOcupado(true); setErro(""); setMensagem("");
    try {
      const resposta = await fetch(endpoint, {
        method: testar ? "POST" : "PUT", headers: { "Content-Type": "application/json" },
        ...(testar ? {} : { body: JSON.stringify({ ...campos, emailPort: Number(campos.emailPort) }) }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível concluir a operação.");
      setMensagem(dados.mensagem);
      if (!testar) {
        setCampos((anterior) => ({ ...anterior, emailPass: "" }));
        setSenhaConfigurada(true); setAlterado(false);
      }
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível concluir a operação."); }
    finally { setOcupado(false); }
  }

  return <div className="mx-auto max-w-3xl">
    <h1 className="text-2xl font-bold text-slate-900">Parametrização Geral</h1>
    <p className="mt-2 text-slate-600">Configurações de uso exclusivo da equipe da plataforma.</p>
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="titulo-email">
      <h2 id="titulo-email" className="text-lg font-semibold text-slate-900">E-mail da plataforma</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Conta utilizada nas comunicações da plataforma com os responsáveis pelas empresas cadastradas. Os responsáveis são os administradores ativos de cada empresa. Esta configuração não altera as contas de e-mail das empresas.</p>
      {carregando ? <p role="status" className="mt-6">Carregando configuração...</p> : <form className="mt-6 space-y-5" onSubmit={(evento) => { evento.preventDefault(); void executar(false); }}>
        <fieldset disabled={ocupado || indisponivel} className="space-y-5 disabled:opacity-70">
          <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
            <label className="block text-sm font-medium text-slate-700">Host SMTP
              <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3" value={campos.emailHost} onChange={(e) => mudar("emailHost", e.target.value)} placeholder="smtp.seuprovedor.com" required maxLength={253} autoComplete="off" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Porta
              <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3" type="number" min={1} max={65535} value={campos.emailPort} onChange={(e) => mudar("emailPort", e.target.value)} required />
            </label>
          </div>
          <p className="text-xs text-slate-500">Porta 465: TLS direto. Nas demais portas, a conexão exige STARTTLS, normalmente na porta 587.</p>
          <label className="block text-sm font-medium text-slate-700">Usuário SMTP
            <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3" value={campos.emailUser} onChange={(e) => mudar("emailUser", e.target.value)} required maxLength={254} autoComplete="off" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Senha SMTP
            <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3" type="password" value={campos.emailPass} onChange={(e) => mudar("emailPass", e.target.value)} required={!senhaConfigurada} maxLength={1024} autoComplete="new-password" placeholder={senhaConfigurada ? "Configurada — preencha apenas para substituir" : "Informe a senha ou senha de aplicativo"} aria-describedby="ajuda-senha" />
          </label>
          <p id="ajuda-senha" className="text-xs text-slate-500">A senha salva não é exibida. Se já estiver configurada, deixe em branco para mantê-la. Use uma senha de aplicativo quando exigido pelo provedor.</p>
          <label className="block text-sm font-medium text-slate-700">E-mail do remetente (opcional)
            <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3" type="email" value={campos.emailFrom} onChange={(e) => mudar("emailFrom", e.target.value)} maxLength={254} placeholder="Usa o usuário SMTP quando não informado" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={ocupado}>Salvar configuração</button>
            <button type="button" className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 disabled:opacity-50" disabled={ocupado || alterado || !senhaConfigurada} onClick={() => void executar(true)}>Testar conexão SMTP</button>
          </div>
          <p className="text-xs text-slate-500">Salve as alterações antes de testar. O teste verifica a conexão e a autenticação; não envia e-mails.</p>
        </fieldset>
      </form>}
      {ocupado && <p role="status" className="mt-4 text-sm text-slate-600">Processando...</p>}
      {mensagem && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-emerald-800">{mensagem}</p>}
      {erro && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-800">{erro}</p>}
    </section>
  </div>;
}
