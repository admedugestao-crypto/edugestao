---
name: testar-notificacoes
description: Testa localmente os fluxos de notificação (WhatsApp e e-mail) de lembrete de prova e lembrete de aula, sem enviar mensagens reais para números/e-mails de produção. Use quando o usuário pedir para validar mudanças em src/lib/notificacoes.ts, src/lib/email.ts ou nas rotas de cron.
---

# Testar notificações (WhatsApp/e-mail) com segurança

O EduGestão envia WhatsApp (via Fonnte/Evolution API) e e-mail (via nodemailer) automaticamente por cron (`src/app/api/cron/notificacoes/**`). Testar isso sem cuidado manda mensagens reais para responsáveis/professoras cadastrados.

## Antes de tudo: isolar do envio real

1. Confirme com o usuário se o banco local aponta para dev/staging (não produção) — veja `DATABASE_URL` em `.env.local`. **Nunca rode este teste apontando para o banco de produção** sem confirmação explícita, mesmo que seja "só teste" — os dados de aluno/professora podem ser reais.
2. Se possível, teste com uma empresa/aluno/professora fictícios cujo `whatsapp`/`telefoneResponsavel`/`email` seja um número/e-mail próprio do desenvolvedor, não de um usuário real.
3. Se as credenciais de `FONNTE_TOKEN`/`EVOLUTION_API_*`/`EMAIL_*` não estiverem configuradas no `.env` local, o envio real falha graciosamente ("não configurado") — isso é seguro para testar a lógica de seleção/deduplicação sem disparar mensagem nenhuma. Prefira este modo por padrão ao testar lógica, só configure credenciais reais quando for validar a integração de fato.

## Rotas de cron disponíveis

- `POST /api/cron/notificacoes` — dispara os três processos (prova WhatsApp, prova e-mail, aula WhatsApp).
- `POST /api/cron/notificacoes/whatsapp` e `.../email` — disparam só um canal.

## Verificando deduplicação

Depois de rodar uma vez, rode de novo o mesmo endpoint e confirme que `enviadas`/`enviada` não duplicam — os registros `NotificacaoProva`/`NotificacaoAula` já marcados como enviados devem ser pulados (ver campo `enviada`/`emailEnviado` no upsert). Para forçar reenvio em teste, apague ou reset o registro de notificação correspondente no banco local, nunca em produção.

## Se precisar depurar mensagem/erro de envio

O resultado de cada processo (`processarNotificacoes`, `processarNotificacoesEmail`, `processarNotificacoesAula`) retorna `erros: string[]` com o motivo real de cada falha (HTTP status, corpo da resposta) — comece por aí antes de instrumentar logs novos.
