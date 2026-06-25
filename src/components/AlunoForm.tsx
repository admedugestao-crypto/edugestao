"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SERIES } from "@/lib/series";
import { Camera, MapPin, User, School, BookOpen, Trash2, DollarSign, CalendarDays } from "lucide-react";

type Escola = {
  id: string;
  nome: string;
  unidades: { id: string; nome: string }[];
};
type Materia = { id: string; nome: string; cor: string };
type Horario = { dia: string; inicio: string; fim: string };
type Professora = { id: string; usuario: { nome: string }; disponibilidade?: Horario[] };

const DIA_NOME: Record<string, string> = {
  "0": "Domingo", "1": "Segunda", "2": "Terça",
  "3": "Quarta", "4": "Quinta", "5": "Sexta", "6": "Sábado",
};

export default function AlunoForm({
  escolas,
  materias,
  alunoInicial,
  professoras = [],
  perfil,
  dispProfessora = null,
}: {
  escolas: Escola[];
  materias: Materia[];
  alunoInicial?: any;
  professoras?: Professora[];
  perfil?: string;
  dispProfessora?: Horario[] | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [escolaId, setEscolaId] = useState(
    alunoInicial?.unidade?.escolaId ?? ""
  );
  const [fotoPreview, setFotoPreview] = useState<string | null>(
    alunoInicial?.fotoUrl ?? null
  );
  const [materiasSelected, setMateriasSelected] = useState<string[]>(
    alunoInicial?.materias?.map((m: any) => m.materiaId) ?? []
  );
  const [tipoCobranca, setTipoCobranca] = useState<string>(alunoInicial?.tipoCobranca ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // ── Status controlado ──────────────────────────────────────────────────────
  const [status, setStatus] = useState<string>(alunoInicial?.status ?? "");
  const [erroStatusCad, setErroStatusCad] = useState("");

  // ── Rastrear preenchimento dos campos obrigatórios (exceto foto) ──────────
  const [campos, setCampos] = useState({
    nome:                !!alunoInicial?.nome,
    dataNascimento:      !!alunoInicial?.dataNascimento,
    responsavel:         !!alunoInicial?.responsavel,
    telefoneResponsavel: !!alunoInicial?.telefoneResponsavel,
    emailResponsavel:    !!alunoInicial?.emailResponsavel,
    cep:                 !!alunoInicial?.cep,
    rua:                 !!alunoInicial?.rua,
    numero:              !!alunoInicial?.numero,
    bairro:              !!alunoInicial?.bairro,
    cidade:              !!alunoInicial?.cidade,
    estado:              !!alunoInicial?.estado,
    unidadeId:           !!alunoInicial?.unidadeId,
    serie:               !!alunoInicial?.serie,
    turma:               !!alunoInicial?.turma,
    professoraId:        perfil !== "SUPERADMIN" || !!alunoInicial?.professoraId,
  });

  function setCampo(key: keyof typeof campos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setCampos((prev) => ({ ...prev, [key]: !!e.target.value.trim() }));
  }

  const [dataInicio, setDataInicio] = useState<string>(
    alunoInicial?.dataInicioContrato
      ? new Date(alunoInicial.dataInicioContrato).toISOString().split("T")[0]
      : ""
  );
  const [dataFim, setDataFim] = useState<string>(
    alunoInicial?.dataFimContrato
      ? new Date(alunoInicial.dataFimContrato).toISOString().split("T")[0]
      : ""
  );

  // Cadastro completo quando todos os campos rastreados estão preenchidos
  // + escola selecionada + ao menos 1 matéria + tipo de cobrança + status + datas contratuais
  const cadastroCompleto =
    Object.values(campos).every(Boolean) &&
    !!escolaId &&
    materiasSelected.length > 0 &&
    !!tipoCobranca &&
    !!status &&
    !!dataInicio &&
    !!dataFim;

  function handleStatusChange(val: string) {
    setErroStatusCad("");
    setStatus(val);
  }
  const erroPeriodo = dataInicio && dataFim && dataFim < dataInicio
    ? "A data de término não pode ser anterior à data de início."
    : null;
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [erroExcluir, setErroExcluir] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  // ── Agenda controlada ──────────────────────────────────────────────────────
  const [diaSemana, setDiaSemana] = useState<string>(
    alunoInicial?.diaSemana != null ? String(alunoInicial.diaSemana) : ""
  );
  const [horaAula, setHoraAula] = useState<string>(alunoInicial?.horaAula ?? "");
  const [professoraId, setProfessoraId] = useState<string>(alunoInicial?.professoraId ?? "");

  function getDisponibilidade(): Horario[] {
    if (perfil !== "SUPERADMIN") return dispProfessora ?? [];
    const prof = professoras.find((p) => p.id === professoraId);
    return (prof?.disponibilidade as Horario[]) ?? [];
  }

  function validarAgenda(): string | null {
    if (!diaSemana || !horaAula) return null;
    const disp = getDisponibilidade();
    if (disp.length === 0) return null;
    const nomeDia = DIA_NOME[diaSemana];
    const horariosDia = disp.filter((h) => h.dia === nomeDia);
    if (horariosDia.length === 0)
      return `Professor(a) não tem disponibilidade cadastrada para ${nomeDia}.`;
    const dentro = horariosDia.some((h) => horaAula >= h.inicio && horaAula < h.fim);
    if (!dentro) {
      const faixas = horariosDia.map((h) => `${h.inicio}–${h.fim}`).join(", ");
      return `Horário ${horaAula} fora da disponibilidade de ${nomeDia} (${faixas}).`;
    }
    return null;
  }

  const erroAgenda = validarAgenda();

  const unidades =
    escolas.find((e) => e.id === escolaId)?.unidades ?? [];

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFotoPreview(URL.createObjectURL(file));
    }
  }

  function toggleMateria(id: string) {
    setMateriasSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  async function handleExcluir() {
    setErroExcluir("");
    setExcluindo(true);
    const res = await fetch(`/api/alunos/${alunoInicial.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setErroExcluir(data.erro ?? "Erro ao excluir.");
      setExcluindo(false);
      return;
    }
    window.location.href = "/dashboard/alunos";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    setErro("");

    if (materiasSelected.length === 0) {
      setErro("Selecione pelo menos uma disciplina.");
      setSalvando(false);
      return;
    }

    if (!tipoCobranca) {
      setErro("Selecione o tipo de cobrança.");
      setSalvando(false);
      return;
    }

    if (!status) {
      setErro("Selecione o status do aluno.");
      setSalvando(false);
      return;
    }

    if (!dataInicio || !dataFim) {
      setErro("Preencha as datas de início e término do contrato.");
      setSalvando(false);
      return;
    }

    if (erroPeriodo) {
      setErro(erroPeriodo);
      setSalvando(false);
      return;
    }

    const form = new FormData(e.currentTarget);

    if (perfil === "SUPERADMIN" && !form.get("professoraId")) {
      setErro("Selecione o(a) professor(a) responsável.");
      setSalvando(false);
      return;
    }

    const erroAg = validarAgenda();
    if (erroAg) {
      setErro(erroAg);
      setSalvando(false);
      return;
    }

    form.set("materias", JSON.stringify(materiasSelected));

    const url = alunoInicial
      ? `/api/alunos/${alunoInicial.id}`
      : "/api/alunos";
    const method = alunoInicial ? "PUT" : "POST";

    try {
      const res  = await fetch(url, { method, body: form });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErro((data as any).erro ?? `Erro ao salvar (HTTP ${res.status}).`);
        setSalvando(false);
        return;
      }

      // Navegação completa para garantir dados frescos (sem cache do router)
      window.location.href = "/dashboard/alunos";
    } catch (err) {
      setErro("Falha de comunicação com o servidor.");
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Foto */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Camera size={17} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Foto do aluno</h2>
        </div>
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 hover:border-indigo-400 cursor-pointer flex items-center justify-center overflow-hidden transition-colors"
          >
            {fotoPreview ? (
              <Image
                src={fotoPreview}
                alt="foto"
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : (
              <Camera size={24} className="text-slate-400" />
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {fotoPreview ? "Trocar foto" : "Adicionar foto"}
            </button>
            <p className="text-xs text-slate-500 mt-1">JPG ou PNG, máx. 2MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            name="foto"
            accept="image/*"
            onChange={handleFoto}
            className="hidden"
          />
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={17} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Dados pessoais</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nome completo *
            </label>
            <input
              name="nome"
              required
              defaultValue={alunoInicial?.nome}
              onChange={setCampo("nome")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Data de nascimento *
            </label>
            <input
              name="dataNascimento"
              type="date"
              required
              defaultValue={
                alunoInicial?.dataNascimento
                  ? new Date(alunoInicial.dataNascimento)
                      .toISOString()
                      .split("T")[0]
                  : ""
              }
              onChange={setCampo("dataNascimento")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Responsável *
            </label>
            <input
              name="responsavel"
              required
              defaultValue={alunoInicial?.responsavel}
              onChange={setCampo("responsavel")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Telefone do responsável *
            </label>
            <input
              name="telefoneResponsavel"
              required
              defaultValue={alunoInicial?.telefoneResponsavel}
              onChange={setCampo("telefoneResponsavel")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              E-mail do responsável *
            </label>
            <input
              name="emailResponsavel"
              type="email"
              required
              defaultValue={alunoInicial?.emailResponsavel}
              onChange={setCampo("emailResponsavel")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={17} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Endereço residencial</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CEP *</label>
            <input
              name="cep"
              required
              defaultValue={alunoInicial?.cep}
              placeholder="00000-000"
              onChange={setCampo("cep")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Rua *</label>
            <input
              name="rua"
              required
              defaultValue={alunoInicial?.rua}
              onChange={setCampo("rua")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Número *</label>
            <input
              name="numero"
              required
              defaultValue={alunoInicial?.numero}
              onChange={setCampo("numero")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Complemento</label>
            <input
              name="complemento"
              defaultValue={alunoInicial?.complemento}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bairro *</label>
            <input
              name="bairro"
              required
              defaultValue={alunoInicial?.bairro}
              onChange={setCampo("bairro")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cidade *</label>
            <input
              name="cidade"
              required
              defaultValue={alunoInicial?.cidade}
              onChange={setCampo("cidade")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado *</label>
            <input
              name="estado"
              required
              defaultValue={alunoInicial?.estado}
              maxLength={2}
              placeholder="SP"
              onChange={setCampo("estado")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Escola */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <School size={17} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Escola</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Escola *
            </label>
            <select
              name="escolaId"
              value={escolaId}
              onChange={(e) => setEscolaId(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {escolas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Unidade *
            </label>
            <select
              name="unidadeId"
              required
              defaultValue={alunoInicial?.unidadeId}
              onChange={setCampo("unidadeId")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Série *
            </label>
            <select
              name="serie"
              required
              defaultValue={alunoInicial?.serie ?? ""}
              onChange={setCampo("serie")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="" disabled>Selecione a série</option>
              {SERIES.map((g) => (
                <optgroup key={g.grupo} label={g.grupo}>
                  {g.opcoes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Turma *</label>
            <input
              name="turma"
              required
              defaultValue={alunoInicial?.turma}
              placeholder="Ex: A"
              onChange={setCampo("turma")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status *</label>
            <select
              name="status"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${!status ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}
            >
              <option value="">Selecione o status…</option>
              <option value="ATIVO">Ativo</option>
              <option value="PAUSADO">Pausado</option>
              <option value="ENCERRADO">Encerrado</option>
            </select>
            {!status && (
              <p className="text-xs text-amber-600 mt-1">Campo obrigatório — selecione o status.</p>
            )}
          </div>
          {perfil === "SUPERADMIN" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Professor(a) *
              </label>
              {professoras.length > 0 ? (
                <select
                  name="professoraId"
                  value={professoraId}
                  required
                  onChange={(e) => { setProfessoraId(e.target.value); setCampos((prev) => ({ ...prev, professoraId: !!e.target.value })); }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione o(a) professor(a)…</option>
                  {professoras.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.usuario.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-red-500 mt-1">
                  ⚠️ Nenhum(a) professor(a) cadastrado(a). Cadastre em Usuários antes de adicionar alunos.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Disciplinas */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={17} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Disciplinas atendidas *</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {materias.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleMateria(m.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                materiasSelected.includes(m.id)
                  ? "border-transparent text-white"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
              style={
                materiasSelected.includes(m.id)
                  ? { backgroundColor: m.cor }
                  : {}
              }
            >
              {m.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Agenda */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={17} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Agenda</h2>
          <span className="text-xs text-slate-400 ml-1">(opcional)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dia fixo de aula</label>
            <select name="diaSemana" value={diaSemana}
              onChange={(e) => setDiaSemana(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${erroAgenda ? "border-amber-400 bg-amber-50" : "border-slate-200"}`}
            >
              <option value="">Sem dia fixo</option>
              <option value="0">Domingo</option>
              <option value="1">Segunda-feira</option>
              <option value="2">Terça-feira</option>
              <option value="3">Quarta-feira</option>
              <option value="4">Quinta-feira</option>
              <option value="5">Sexta-feira</option>
              <option value="6">Sábado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Horário de início</label>
            <input type="time" name="horaAula" value={horaAula}
              onChange={(e) => setHoraAula(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${erroAgenda ? "border-amber-400 bg-amber-50" : "border-slate-200"}`}
            />
            <p className="text-xs text-slate-400 mt-1">Duração fixa de 1 hora. Usado pelo "Gerar semana".</p>
          </div>
        </div>
        {erroAgenda && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            ⚠️ {erroAgenda}
          </p>
        )}
      </div>

      {/* Cobrança */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={17} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Cobrança *</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tipo */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de cobrança *</label>
            <select
              name="tipoCobranca"
              value={tipoCobranca}
              onChange={(e) => setTipoCobranca(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                !tipoCobranca ? "border-amber-300 bg-amber-50" : "border-slate-200"
              }`}
            >
              <option value="">Selecione o tipo…</option>
              <option value="MENSAL">Mensal</option>
              <option value="QUINZENAL">Quinzenal (2x por mês)</option>
              <option value="SEMANAL">Semanal</option>
              <option value="POR_AULA">Por aula</option>
            </select>
            {!tipoCobranca && (
              <p className="text-xs text-amber-600 mt-1">Campo obrigatório — selecione o tipo de cobrança.</p>
            )}
          </div>

          {/* MENSAL */}
          {tipoCobranca === "MENSAL" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dia do vencimento *</label>
                <input name="diaPagamento" type="number" min={1} max={31} required
                  defaultValue={alunoInicial?.diaPagamento ?? ""}
                  placeholder="Ex: 10"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Valor mensal (R$) *</label>
                <input name="valorCobranca" type="number" step="0.01" min={0} required
                  defaultValue={alunoInicial?.valorCobranca ?? ""}
                  placeholder="Ex: 350.00"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          {/* QUINZENAL */}
          {tipoCobranca === "QUINZENAL" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">1º vencimento (dia) *</label>
                <input name="diaPagamento" type="number" min={1} max={31} required
                  defaultValue={alunoInicial?.diaPagamento ?? ""}
                  placeholder="Ex: 5"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">2º vencimento (dia) *</label>
                <input name="diaPagamento2" type="number" min={1} max={31} required
                  defaultValue={alunoInicial?.diaPagamento2 ?? ""}
                  placeholder="Ex: 20"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Valor por parcela (R$) *</label>
                <input name="valorCobranca" type="number" step="0.01" min={0} required
                  defaultValue={alunoInicial?.valorCobranca ?? ""}
                  placeholder="Ex: 175.00"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          {/* SEMANAL */}
          {tipoCobranca === "SEMANAL" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dia de vencimento semanal *</label>
                <select name="diaSemanaCobranca" required
                  defaultValue={alunoInicial?.diaSemanaCobranca ?? ""}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione o dia…</option>
                  <option value="0">Domingo</option>
                  <option value="1">Segunda-feira</option>
                  <option value="2">Terça-feira</option>
                  <option value="3">Quarta-feira</option>
                  <option value="4">Quinta-feira</option>
                  <option value="5">Sexta-feira</option>
                  <option value="6">Sábado</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">Dia da semana em que o pagamento vence a cada semana.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Valor por semana (R$) *</label>
                <input name="valorCobranca" type="number" step="0.01" min={0} required
                  defaultValue={alunoInicial?.valorCobranca ?? ""}
                  placeholder="Ex: 80.00"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          {/* POR_AULA */}
          {tipoCobranca === "POR_AULA" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor por aula (R$) *</label>
              <input name="valorCobranca" type="number" step="0.01" min={0} required
                defaultValue={alunoInicial?.valorCobranca ?? ""}
                placeholder="Ex: 50.00"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-400 mt-1">O total do mês é calculado automaticamente pelo número de aulas registradas no conteúdo.</p>
            </div>
          )}
        </div>
      </div>

      {/* Período contratual */}
      <div className={`bg-white rounded-xl border p-5 ${erroPeriodo ? "border-red-300" : "border-slate-200"}`}>
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={17} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Período contratual *</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Data de início *</label>
            <input
              type="date"
              name="dataInicioContrato"
              value={dataInicio}
              required
              onChange={(e) => setDataInicio(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                erroPeriodo || !dataInicio ? "border-amber-300 bg-amber-50" : "border-slate-200"
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Data de término *</label>
            <input
              type="date"
              name="dataFimContrato"
              value={dataFim}
              required
              min={dataInicio || undefined}
              onChange={(e) => setDataFim(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                erroPeriodo || !dataFim ? "border-amber-300 bg-amber-50" : "border-slate-200"
              }`}
            />
          </div>
        </div>
        {erroPeriodo && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            ⚠️ {erroPeriodo}
          </p>
        )}
        {(!dataInicio || !dataFim) && !erroPeriodo && (
          <p className="text-xs text-amber-600 mt-2">Campo obrigatório — preencha as datas do contrato.</p>
        )}
      </div>

      {/* Observações */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <label className="block text-xs font-medium text-slate-600 mb-2">
          Observações
        </label>
        <textarea
          name="observacoes"
          defaultValue={alunoInicial?.observacoes}
          rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          placeholder="Informações adicionais sobre o aluno..."
        />
      </div>

      {erro && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={salvando}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          {salvando ? "Salvando..." : alunoInicial ? "Salvar alterações" : "Cadastrar aluno"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          Cancelar
        </button>
        {alunoInicial && (
          <button
            type="button"
            onClick={() => { setErroExcluir(""); setConfirmExcluir(true); }}
            className="ml-auto flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            <Trash2 size={15} />
            Excluir aluno
          </button>
        )}
      </div>

      {/* Modal confirmação de exclusão */}
      {confirmExcluir && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Confirmar exclusão</h2>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir o aluno{" "}
              <strong>{alunoInicial?.nome}</strong>?
            </p>
            {erroExcluir && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">
                {erroExcluir}
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleExcluir}
                disabled={excluindo}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {excluindo ? "Excluindo..." : "Excluir"}
              </button>
              <button
                onClick={() => { setConfirmExcluir(false); setErroExcluir(""); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
