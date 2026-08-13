"use client";

type MateriaOpcao = { id: string; nome: string; cor: string };

type Props = {
  materiasDisponiveis: MateriaOpcao[];
  selecionadas: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

// Multi-seleção de matérias — substitui o antigo <select> único com opção
// "Todas as matérias". Vazio = "todas" (mesmo significado de antes, só que
// agora é literalmente "nenhuma caixinha marcada" em vez de um valor especial).
export default function SeletorMaterias({ materiasDisponiveis, selecionadas, onChange, disabled }: Props) {
  const todasMarcadas = materiasDisponiveis.length > 0 && selecionadas.length === materiasDisponiveis.length;

  function alternar(id: string) {
    if (disabled) return;
    onChange(selecionadas.includes(id) ? selecionadas.filter((s) => s !== id) : [...selecionadas, id]);
  }

  function marcarTodas() {
    if (disabled) return;
    onChange(todasMarcadas ? [] : materiasDisponiveis.map((m) => m.id));
  }

  if (materiasDisponiveis.length === 0) {
    return <p className="text-xs text-slate-400">Nenhuma matéria disponível.</p>;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={marcarTodas}
        disabled={disabled}
        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {todasMarcadas ? "Desmarcar todas" : "Marcar todas"}
      </button>
      <div className="flex flex-wrap gap-2">
        {materiasDisponiveis.map((m) => {
          const marcada = selecionadas.includes(m.id);
          return (
            <label
              key={m.id}
              className={`flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                disabled ? "cursor-not-allowed opacity-60" : ""
              }`}
              style={
                marcada
                  ? { backgroundColor: `${m.cor}22`, borderColor: m.cor, color: m.cor }
                  : { borderColor: "#e2e8f0", color: "#475569" }
              }
            >
              <input
                type="checkbox"
                checked={marcada}
                onChange={() => alternar(m.id)}
                disabled={disabled}
                className="w-3.5 h-3.5 rounded"
                style={{ accentColor: m.cor }}
              />
              {m.nome}
            </label>
          );
        })}
      </div>
      {selecionadas.length === 0 && (
        <p className="text-xs text-slate-400">Nenhuma marcada = todas as matérias.</p>
      )}
    </div>
  );
}
