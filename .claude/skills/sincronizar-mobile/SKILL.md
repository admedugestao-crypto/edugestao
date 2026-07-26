---
name: sincronizar-mobile
description: Sincroniza o bundle web com os projetos nativos Android/iOS via Capacitor e abre o app para testar. Use quando o usuário pedir para "testar no app", "rodar no celular/emulador", ou depois de qualquer mudança relevante em componentes *Mobile.tsx / src/app/m/**.
---

# Sincronizar e testar o app mobile (Capacitor)

O EduGestão empacota a versão web como app nativo via Capacitor (`android/`, `ios/`, `capacitor.config.ts`). O app nativo **não** reflete mudanças no código web automaticamente — é preciso sincronizar.

## Passos

1. Build do bundle web (confirme com o usuário se é build de produção ou apenas o dev server, dependendo do fluxo de teste configurado em `capacitor.config.ts` — se `server.url` aponta para um dev server, o passo de build pode não ser necessário).
2. Rodar `npx cap sync` na raiz do projeto — isso copia os assets web e sincroniza plugins/dependências nativas para `android/` e `ios/`.
3. Para testar:
   - Android: `npx cap open android` (abre o Android Studio) ou `npx cap run android` se houver emulador/dispositivo conectado.
   - iOS: `npx cap open ios` (abre o Xcode, necessário macOS) ou `npx cap run ios`.

## Cuidados

- Nunca rode `npx cap add android`/`npx cap add ios` sobre as pastas já existentes — isso pode sobrescrever configuração nativa customizada (ícones, permissões, `AndroidManifest.xml`/`Info.plist` editados manualmente). Se as pastas já existem, o fluxo correto é sempre `cap sync`, nunca `cap add`.
- Se a mudança testada foi só em uma tela mobile (`*Mobile.tsx`) sem tocar em código nativo/plugins, `cap sync` ainda é necessário porque o bundle web embutido no app muda.
- Depois de sincronizar, confirme visualmente no emulador/dispositivo que a tela alterada carrega os dados corretos (login, sessão) — isso não é coberto por `cap sync`, é teste funcional manual.
