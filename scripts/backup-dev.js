// Gera um snapshot em JSON de todas as tabelas do banco de DEV, salvo na
// pasta passada como argumento. Le a conexao do .env do projeto (nunca
// imprime a string de conexao). Rodar com: node scripts/backup-dev.js <pasta-destino>

const { Client } = require("pg");
const dns = require("dns");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

const destino = process.argv[2];
if (!destino) {
  console.error("Uso: node backup-dev.js <pasta-destino>");
  process.exit(1);
}

const parsed = dotenv.parse(fs.readFileSync(path.join(__dirname, "..", ".env")));
const url = (parsed.DIRECT_URL || parsed.DATABASE_URL)
  .replace("?pgbouncer=true", "")
  .replace("&pgbouncer=true", "");

(async () => {
  const client = new Client({
    connectionString: url,
    lookup: (h, o, cb) => dns.lookup(h, { family: 4 }, cb),
  });
  await client.connect();

  const { rows: tabelas } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );

  const backup = {};
  for (const { tablename } of tabelas) {
    const { rows } = await client.query(`SELECT * FROM "${tablename}"`);
    backup[tablename] = rows;
  }

  await client.end();

  const dataHoje = new Date().toISOString().slice(0, 10);
  const arquivo = path.join(destino, `dev_backup_${dataHoje}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(backup, null, 2));

  const totalLinhas = Object.values(backup).reduce((acc, rows) => acc + rows.length, 0);
  console.log(`Backup salvo em ${arquivo} (${tabelas.length} tabelas, ${totalLinhas} linhas).`);
})().catch((err) => {
  console.error("Erro no backup:", err.message);
  process.exit(1);
});
