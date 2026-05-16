export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { processarNotificacoes, processarNotificacoesEmail } = await import("./lib/notificacoes");

    // ── Executa WhatsApp + E-mail sequencialmente (evita race condition no SQLite) ──
    async function executarNotificacoes(origem: string) {
      console.log(`[Notificações/${origem}] Verificando provas próximas...`);
      try {
        const rWpp = await processarNotificacoes();
        console.log(`[WhatsApp/${origem}] Enviadas: ${rWpp.enviadas} | Pendentes: ${rWpp.pendentes.length} | Erros: ${rWpp.erros.length}`);
        if (rWpp.erros.length > 0) rWpp.erros.forEach((e) => console.warn(`[WhatsApp/${origem}] Erro:`, e));
      } catch (err) {
        console.error(`[WhatsApp/${origem}] Erro fatal:`, err);
      }

      try {
        const rEmail = await processarNotificacoesEmail();
        console.log(`[E-mail/${origem}] Enviados: ${rEmail.enviadas} | Erros: ${rEmail.erros.length}`);
        if (rEmail.erros.length > 0) rEmail.erros.forEach((e) => console.warn(`[E-mail/${origem}] Erro:`, e));
      } catch (err) {
        console.error(`[E-mail/${origem}] Erro fatal:`, err);
      }
    }

    // ── Cron diário às 08:00 ─────────────────────────────────────────────────
    cron.schedule("0 8 * * *", () => executarNotificacoes("cron"));

    // ── Verificação na inicialização (cobre reinicializações após 08:00) ─────
    // Aguarda 10 s para o servidor estar completamente pronto antes de checar
    setTimeout(() => {
      const agora = new Date();
      const hora = agora.getHours();
      // Executa só se já passamos das 08:00 no dia atual (servidor reiniciou depois do cron)
      if (hora >= 8) {
        console.log("[Notificações/startup] Servidor iniciado após 08:00 — executando verificação de recuperação.");
        executarNotificacoes("startup");
      }
    }, 10_000);

    console.log("[Notificações] Cron agendado — WhatsApp + E-mail sequencial todo dia às 08:00");
  }
}
