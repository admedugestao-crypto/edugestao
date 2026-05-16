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

export default function AlunoForm({
  escolas,
  materias,
  alunoInicial,
}: {
  escolas: Escola[];
  materias: Materia[];
  alunoInicial?: any;
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
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [erroExcluir, setErroExcluir] = useState("");
  const [excluindo, setExcluindo] = useState(false);

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
    router.push("/dashboard/alunos");
    router.refresh();
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

    const form = new FormData(e.currentTarget);
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

      router.push("/dashboard/alunos");
      router.refresh();
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
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Rua *</label>
            <input
              name="rua"
              required
              defaultValue={alunoInicial?.rua}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Número *</label>
            <input
              name="numero"
              required
              defaultValue={alunoInicial?.numero}
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
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cidade *</label>
            <input
              name="cidade"
              required
              defaultValue={alunoInicial?.cidade}
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
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select
              name="status"
              defaultValue={alunoInicial?.status ?? "ATIVO"}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ATIVO">Ativo</option>
              <option value="PAUSADO">Pausado</option>
              <option value="ENCERRADO">Encerrado</option>
            </select>
          </div>
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
            <select name="diaSemana"
              defaultValue={alunoInicial?.diaSemana ?? ""}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <input type="time" name="horaAula"
              defaultValue={alunoInicial?.horaAula ?? ""}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">Duração fixa de 1 hora. Usado pelo "Gerar semana".</p>
          </div>
        </div>
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
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor por semana (R$) *</label>
              <input name="valorCobranca" type="number" step="0.01" min={0} required
                defaultValue={alunoInicial?.valorCobranca ?? ""}
                placeholder="Ex: 80.00"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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
