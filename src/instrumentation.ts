// As notificações são disparadas pelo Vercel Cron Job configurado em vercel.json
// que chama POST /api/cron/notificacoes todo dia às 08:00 (BRT = 11:00 UTC).
// node-cron não funciona em ambientes serverless (Vercel).
export async function register() {}
