import { prisma } from "@/lib/prisma";
import { requirePlataforma } from "@/lib/plataforma";
import { redirect } from "next/navigation";
import { MODULOS_ACESSO } from "@/lib/modulosAcesso";

export const dynamic = "force-dynamic";
type Filtros = { inicio?: string; fim?: string; empresaId?: string; usuarioId?: string; modulo?: string };
const dataLocal = (data: Date) => data.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
function dataValida(valor: string | undefined, padrao: string) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return padrao;
  const data = new Date(`${valor}T12:00:00Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor ? valor : padrao;
}

export default async function AcessosPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  if (!(await requirePlataforma())) redirect("/plataforma/login");
  const filtros = await searchParams;
  const agora = new Date();
  const hoje = dataLocal(agora);
  const inicio = dataValida(filtros.inicio, dataLocal(new Date(agora.getTime() - 29 * 86400000)));
  const fim = dataValida(filtros.fim, hoje);
  const de = new Date(`${inicio}T00:00:00-03:00`);
  const ate = new Date(new Date(`${fim}T00:00:00-03:00`).getTime() + 86400000);
  const erroPeriodo = de >= ate || ate.getTime() - de.getTime() > 366 * 86400000;
  const empresaId = typeof filtros.empresaId === "string" ? filtros.empresaId : "";
  const usuarioId = typeof filtros.usuarioId === "string" ? filtros.usuarioId : "";
  const modulo = typeof filtros.modulo === "string" && Object.hasOwn(MODULOS_ACESSO, filtros.modulo) ? filtros.modulo : "";
  const [empresas, usuarios] = await Promise.all([
    prisma.empresa.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.usuario.findMany({ where: { empresaId: empresaId || { not: null } }, select: { id: true, nome: true, empresaId: true }, orderBy: { nome: "asc" } }),
  ]);
  const grupos = erroPeriodo ? [] : await prisma.acessoApp.groupBy({
    by: ["empresaId", "usuarioId", "modulo", "canal"],
    where: { criadoEm: { gte: de, lt: ate }, ...(empresaId ? { empresaId } : {}), ...(usuarioId ? { usuarioId } : {}), ...(modulo ? { modulo } : {}) },
    _count: { _all: true }, _max: { criadoEm: true },
    orderBy: { _count: { id: "desc" } },
  });
  const nomesEmpresas = new Map(empresas.map(e => [e.id, e.nome]));
  const nomesUsuarios = new Map(usuarios.map(u => [u.id, u.nome]));
  const total = grupos.reduce((soma, grupo) => soma + grupo._count._all, 0);
  const rankings = new Map<string, number>();
  for (const grupo of grupos) rankings.set(grupo.modulo, (rankings.get(grupo.modulo) ?? 0) + grupo._count._all);
  const campo = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Análise de acessos</h1>
      <p className="mt-1 text-sm text-slate-600">Uso do EduGestão por empresa, usuário e módulo, nas versões web e mobile.</p></div>
    <form className="grid gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">Data inicial<input className={campo} name="inicio" type="date" defaultValue={inicio} required /></label>
      <label className="text-sm">Data final<input className={campo} name="fim" type="date" defaultValue={fim} required /></label>
      <label className="text-sm">Empresa<select className={campo} name="empresaId" defaultValue={empresaId}><option value="">Todas as empresas</option>{empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></label>
      <label className="text-sm">Usuário<select className={campo} name="usuarioId" defaultValue={usuarioId}><option value="">Todos os usuários</option>{usuarios.map(u => <option key={u.id} value={u.id}>{u.nome} — {nomesEmpresas.get(u.empresaId ?? "")}</option>)}</select></label>
      <label className="text-sm">Módulo<select className={campo} name="modulo" defaultValue={modulo}><option value="">Todos os módulos</option>{Object.entries(MODULOS_ACESSO).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label>
      <button className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Aplicar filtros</button>
    </form>
    {erroPeriodo && <p role="alert" className="text-red-700">Selecione um período válido de até 366 dias.</p>}
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[
      ["Acessos", total], ["Empresas ativas no período", new Set(grupos.map(g => g.empresaId)).size],
      ["Usuários ativos no período", new Set(grupos.map(g => g.usuarioId)).size], ["Módulos utilizados", rankings.size],
    ].map(([titulo, valor]) => <div key={titulo} className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-600">{titulo}</p><p className="mt-2 text-3xl font-bold text-slate-900">{valor.toLocaleString("pt-BR")}</p></div>)}</div>
    <section className="rounded-xl bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Módulos mais acessados</h2><div className="mt-4 space-y-3">{[...rankings].sort((a, b) => b[1] - a[1]).map(([id, quantidade]) => <div key={id}><div className="flex justify-between text-sm"><span>{MODULOS_ACESSO[id] ?? id}</span><span>{quantidade.toLocaleString("pt-BR")}</span></div><div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-indigo-500" style={{ width: `${100 * quantidade / Math.max(...rankings.values())}%` }} /></div></div>)}{!grupos.length && <p className="text-sm text-slate-500">Nenhum acesso registrado para os filtros selecionados.</p>}</div></section>
    <section className="overflow-x-auto rounded-xl bg-white shadow-sm"><table className="w-full text-left text-sm"><caption className="p-5 text-left font-semibold">Detalhamento por empresa, usuário e módulo</caption><thead className="bg-slate-50"><tr>{["Empresa", "Usuário", "Módulo", "Versão", "Acessos", "Último acesso"].map(nome => <th key={nome} className="px-5 py-3">{nome}</th>)}</tr></thead><tbody>{grupos.map(g => <tr key={[g.empresaId, g.usuarioId, g.modulo, g.canal].join(":")} className="border-t border-slate-100"><td className="px-5 py-3">{nomesEmpresas.get(g.empresaId) ?? "Empresa removida"}</td><td className="px-5 py-3">{nomesUsuarios.get(g.usuarioId) ?? "Usuário removido"}</td><td className="px-5 py-3">{MODULOS_ACESSO[g.modulo] ?? g.modulo}</td><td className="px-5 py-3">{g.canal === "MOBILE" ? "Mobile" : "Web"}</td><td className="px-5 py-3">{g._count._all.toLocaleString("pt-BR")}</td><td className="whitespace-nowrap px-5 py-3">{g._max.criadoEm?.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td></tr>)}{!grupos.length && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">Nenhum acesso registrado.</td></tr>}</tbody></table></section>
    <p className="text-xs text-slate-500">Cada acesso representa uma abertura de página. Navegações dentro do mesmo módulo também contam. A coleta começa após a ativação desta funcionalidade; não há histórico retroativo. Datas e horários de Brasília. Mobile inclui navegador mobile e aplicativo.</p>
  </div>;
}
