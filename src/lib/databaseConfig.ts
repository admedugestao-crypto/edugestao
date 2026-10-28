type DatabaseEnvironment = Record<string, string | undefined>;

const BUILD_PLACEHOLDER =
  "postgresql://build_placeholder:build_placeholder@localhost:5432/build_placeholder";

function isProductionVercel(env: DatabaseEnvironment): boolean {
  return env.VERCEL_ENV === "production";
}

function parsePoolMax(rawValue: string | undefined): number {
  if (!rawValue) return 1;

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error("DATABASE_POOL_MAX deve ser um inteiro entre 1 e 5.");
  }

  return value;
}

export function validateAndNormalizeDatabaseUrl(
  rawUrl: string,
  env: DatabaseEnvironment = process.env,
): string {
  if (!rawUrl || /SUA[_ -]?SENHA|YOUR-PASSWORD/i.test(rawUrl)) {
    throw new Error("DATABASE_URL ausente ou ainda contém um placeholder.");
  }

  if (/\s|\[|\]/.test(rawUrl)) {
    throw new Error("DATABASE_URL contém espaços ou colchetes inválidos.");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("DATABASE_URL não é uma URL PostgreSQL válida.");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DATABASE_URL deve usar o protocolo postgresql://.");
  }

  if (!parsed.username || !parsed.password || !parsed.hostname) {
    throw new Error("DATABASE_URL deve conter usuário, senha e servidor.");
  }

  // PrismaPg/pg não usa o parâmetro legado do Prisma. Removê-lo pela API de
  // URL preserva corretamente os demais parâmetros e evita transformar
  // /postgres?pgbouncer=true&sslmode=require em /postgres&sslmode=require.
  parsed.searchParams.delete("pgbouncer");

  // Preview pode usar o pooler IPv4 com a mesma senha da conexão direta.
  // A opção é explícita e nunca altera a conexão de produção.
  const projetoDireto = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
  if (env.VERCEL_ENV === "preview" && projetoDireto && env.DATABASE_POOLER_HOST) {
    if (!/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(env.DATABASE_POOLER_HOST)) {
      throw new Error("DATABASE_POOLER_HOST deve ser um endereço válido do Pooler do Supabase.");
    }
    if (parsed.username !== "postgres") {
      throw new Error("A conversão da conexão direta exige o usuário postgres.");
    }
    parsed.hostname = env.DATABASE_POOLER_HOST;
    parsed.port = "6543";
    parsed.username = `postgres.${projetoDireto[1]}`;
  }

  if (isProductionVercel(env)) {
    if (!parsed.hostname.endsWith(".pooler.supabase.com")) {
      throw new Error("Produção deve usar o Pooler do Supabase.");
    }
    if (parsed.port !== "6543") {
      throw new Error("Produção deve usar o Pooler de transações na porta 6543.");
    }
    if (parsed.pathname !== "/postgres") {
      throw new Error("O banco de produção deve ser /postgres.");
    }
    if (!parsed.username.startsWith("postgres.")) {
      throw new Error("O usuário do Pooler deve usar o formato postgres.<project-ref>.");
    }
  }

  return parsed.toString();
}

export function getDatabaseRuntimeConfig(env: DatabaseEnvironment = process.env) {
  const rawUrl = env.DATABASE_URL ?? (isProductionVercel(env) ? undefined : env.DIRECT_URL);
  const connectionString = validateAndNormalizeDatabaseUrl(rawUrl ?? BUILD_PLACEHOLDER, env);

  return {
    connectionString,
    max: parsePoolMax(env.DATABASE_POOL_MAX),
  };
}
