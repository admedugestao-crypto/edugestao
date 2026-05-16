export const SERIES = [
  { grupo: "Ensino Fundamental 1", opcoes: ["2º ano", "3º ano", "4º ano", "5º ano"] },
  { grupo: "Ensino Fundamental 2", opcoes: ["6º ano", "7º ano", "8º ano", "9º ano"] },
] as const;

export type Serie = (typeof SERIES)[number]["opcoes"][number];
