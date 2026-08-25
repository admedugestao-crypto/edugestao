import Holidays from "date-holidays";

export type AbrangenciaFeriado = "NACIONAL" | "ESTADUAL" | "MUNICIPAL" | "LOCAL";

export type Feriado = {
  data: string;
  nome: string;
  abrangencia: AbrangenciaFeriado;
};

type FeriadoBase = {
  data: string;
  nome: string;
  tipo: "NACIONAL" | "ESTADUAL" | "MUNICIPAL" | "FACULTATIVO";
  uf?: string | null;
  codigo_ibge?: number | null;
};

const VERSAO_BASE = "5d2dbf60dfcc08b8fadb70de45f197ff78f13db0";

function dataBaseParaIso(data: string) {
  const [dia, mes, ano] = data.split("/");
  return `${ano}-${mes}-${dia}`;
}

async function carregarBase(ano: number, abrangencia: "nacional" | "estadual" | "municipal") {
  const url = `https://raw.githubusercontent.com/joaopbini/feriados-brasil/${VERSAO_BASE}/dados/feriados/${abrangencia}/json/${ano}.json`;
  const resposta = await fetch(url, { next: { revalidate: 86_400 } });
  if (!resposta.ok) throw new Error(`Base de feriados ${abrangencia}/${ano} indisponível`);
  return resposta.json() as Promise<FeriadoBase[]>;
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function listarPublicos(calendario: Holidays, ano: number) {
  return calendario
    .getHolidays(ano, "pt")
    .filter((feriado) => feriado.type === "public")
    .map((feriado) => ({ data: feriado.date.slice(0, 10), nome: feriado.name }));
}

function chave(feriado: { data: string; nome: string }) {
  return `${feriado.data}|${normalizarTexto(feriado.nome)}`;
}

function obterFeriadosCalculados(ano: number, estado?: string | null, cidade?: string | null) {
  const uf = estado?.trim().toUpperCase();
  const municipio = cidade?.trim();
  const nacionais = listarPublicos(new Holidays("BR"), ano);
  const resultado: Feriado[] = nacionais.map((feriado) => ({ ...feriado, abrangencia: "NACIONAL" }));
  const chavesNacionais = new Set(nacionais.map(chave));

  let estaduais = nacionais;
  if (uf && /^[A-Z]{2}$/.test(uf)) {
    estaduais = listarPublicos(new Holidays("BR", uf), ano);
    for (const feriado of estaduais) {
      if (!chavesNacionais.has(chave(feriado))) {
        resultado.push({ ...feriado, abrangencia: "ESTADUAL" });
      }
    }
  }

  let municipioCoberto = false;
  if (uf && municipio) {
    const consulta = new Holidays();
    const regioes = consulta.getRegions("BR", uf, "pt") ?? {};
    const municipioNormalizado = normalizarTexto(municipio);
    const codigoRegiao = Object.entries(regioes).find(([, nome]) => normalizarTexto(nome) === municipioNormalizado)?.[0];

    if (codigoRegiao) {
      municipioCoberto = true;
      const municipais = listarPublicos(new Holidays("BR", uf, codigoRegiao), ano);
      const chavesEstaduais = new Set(estaduais.map(chave));
      for (const feriado of municipais) {
        if (!chavesEstaduais.has(chave(feriado))) {
          resultado.push({ ...feriado, abrangencia: "MUNICIPAL" });
        }
      }
    }
  }

  resultado.sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome));
  return { feriados: resultado, municipioCoberto };
}

export async function obterFeriadosBrasil(
  ano: number,
  estado?: string | null,
  cidade?: string | null,
  codigoIbge?: string | null,
) {
  const uf = estado?.trim().toUpperCase();
  const ibge = Number(codigoIbge);

  try {
    const [nacionais, estaduais, municipais] = await Promise.all([
      carregarBase(ano, "nacional"),
      carregarBase(ano, "estadual"),
      carregarBase(ano, "municipal"),
    ]);
    const feriados: Feriado[] = [
      ...nacionais.map((feriado) => ({ data: dataBaseParaIso(feriado.data), nome: feriado.nome, abrangencia: "NACIONAL" as const })),
      ...estaduais
        .filter((feriado) => uf && feriado.uf === uf)
        .map((feriado) => ({ data: dataBaseParaIso(feriado.data), nome: feriado.nome, abrangencia: "ESTADUAL" as const })),
      ...municipais
        .filter((feriado) => Number.isInteger(ibge) && feriado.codigo_ibge === ibge)
        .map((feriado) => ({ data: dataBaseParaIso(feriado.data), nome: feriado.nome, abrangencia: "MUNICIPAL" as const })),
    ];
    feriados.sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome));
    return { feriados, municipioCoberto: Number.isInteger(ibge), fonte: "BASE_IBGE" as const };
  } catch {
    return { ...obterFeriadosCalculados(ano, estado, cidade), fonte: "CALCULO_LOCAL" as const };
  }
}
