"use client";

import { useState } from "react";

export type EnderecoEmpresa = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  codigoIbge: string;
};

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export default function EnderecoEmpresaCampos({
  value,
  onChange,
}: {
  value: EnderecoEmpresa;
  onChange: (value: EnderecoEmpresa) => void;
}) {
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState("");

  function atualizar(campo: keyof EnderecoEmpresa, valor: string) {
    onChange({ ...value, [campo]: valor });
  }

  async function buscarCep() {
    const cep = value.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;

    setBuscandoCep(true);
    setErroCep("");
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const endereco = await resposta.json();
      if (!resposta.ok || endereco.erro) throw new Error("CEP não encontrado.");
      onChange({
        ...value,
        cep: cep.replace(/^(\d{5})(\d{3})$/, "$1-$2"),
        logradouro: endereco.logradouro ?? "",
        bairro: endereco.bairro ?? "",
        cidade: endereco.localidade ?? "",
        estado: endereco.uf ?? "",
        codigoIbge: endereco.ibge ?? "",
      });
    } catch (erro) {
      setErroCep(erro instanceof Error ? erro.message : "Não foi possível consultar o CEP.");
    } finally {
      setBuscandoCep(false);
    }
  }

  const inputClass = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Município e UF são usados para identificar os feriados estaduais e municipais na Agenda.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
          <input
            type="text"
            inputMode="numeric"
            value={value.cep}
            onChange={(e) => atualizar("cep", e.target.value)}
            onBlur={buscarCep}
            placeholder="00000-000"
            maxLength={9}
            className={inputClass}
          />
          {buscandoCep && <p className="text-xs text-indigo-500 mt-1">Consultando CEP...</p>}
          {erroCep && <p className="text-xs text-red-600 mt-1">{erroCep}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Logradouro</label>
          <input type="text" value={value.logradouro} onChange={(e) => atualizar("logradouro", e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
          <input type="text" value={value.numero} onChange={(e) => atualizar("numero", e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
          <input type="text" value={value.complemento} onChange={(e) => atualizar("complemento", e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
        <input type="text" value={value.bairro} onChange={(e) => atualizar("bairro", e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Município</label>
          <input type="text" value={value.cidade} onChange={(e) => atualizar("cidade", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">UF</label>
          <select value={value.estado} onChange={(e) => atualizar("estado", e.target.value)} className={inputClass}>
            <option value="">UF</option>
            {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
