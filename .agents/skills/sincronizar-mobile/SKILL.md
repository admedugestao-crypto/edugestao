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

## Testar mudanças locais (ainda não deployadas) no app nativo via dispositivo físico

`capacitor.config.ts` deste projeto aponta `server.url` direto pra produção (`https://edugestao-bj4p.vercel.app/m`) — o app não empacota bundle local, é sempre uma WebView carregando essa URL. Pra testar uma mudança local antes de ela estar publicada, é preciso apontar temporariamente pro seu dev server:

1. Descubra o IP local do PC na mesma rede Wi-Fi do celular (`Get-NetIPAddress` no PowerShell, ou `ipconfig`).
2. **Confirme qual dev server você vai apontar antes de gastar tempo depurando "a mudança não aparece"**: pode haver mais de um `next dev` rodando em portas diferentes, um deles servindo um checkout/branch antigo sem sua mudança. Rode `curl` na porta ou olhe o log — cada processo mostra de qual pasta foi iniciado (`Get-CimInstance Win32_Process -Filter "ProcessId=<pid>" | select CommandLine`, e o `ParentProcessId` pra achar o `next dev -p <porta>` original).
3. Edite `capacitor.config.ts`: `server.url` pro IP local (`http://<ip>:<porta>/m`), `androidScheme: 'http'`, `cleartext: true`. Se a porta usar HTTP puro, o Android bloqueia por padrão (API 28+) — adicione também `android:usesCleartextTraffic="true"` na tag `<application>` de `android/app/src/main/AndroidManifest.xml` (não é gerado automaticamente pelo `cap sync`).
4. `npx cap sync android` → `npx cap run android` ou `gradlew.bat installDebug` (veja seção de build abaixo) → abrir no dispositivo.
5. **Depois de qualquer mudança de código, é preciso `am force-stop` + reabrir o app** — resumir o app (ícone/multitarefa) NÃO recarrega o WebView, ele mantém o JS já carregado em memória.
6. **Reverta `capacitor.config.ts` e o `AndroidManifest.xml` pra produção antes de terminar** — não deixe essas mudanças temporárias indo pra um commit real.
7. O checkout precisa ter `.env`/`.env.local` (com `DATABASE_URL` etc.) e o Prisma Client gerado (`npx prisma generate`) pra login funcionar contra o dev server local. **Um git worktree isolado normalmente não tem nenhum dos dois** (não tem `node_modules` próprio nem `.env*`, que são gitignored) — prefira testar full-stack (login real) direto no checkout principal em vez de um worktree separado. Veja `[[feedback-single-dev-environment]]`.
8. Deployments de **Preview** na Vercel costumam usar variáveis de ambiente (e banco) diferentes de produção — sua conta pessoal pode não existir lá. Use uma conta de seed (`prisma/seed.ts`) nesse ambiente, não sua conta real.

## Build nativo Android via linha de comando (sem abrir o Android Studio)

Se `npx cap run android`/`npx cap open android` não estiver disponível ou travar, dá pra buildar direto:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"   # JDK embutido do Android Studio
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd android
.\gradlew.bat installDebug
```

- `adb devices` deve mostrar o aparelho como `device` (não `unauthorized`) — a autorização USB pode ser pedida de novo a cada poucos minutos/reconexões; olhe a tela do celular quando `unauthorized` aparecer.
- Rodar `npx cap run android` de dentro do Git Bash pode falhar com `'gradlew' não é reconhecido` (ele tenta chamar sem o `.bat`) — nesse caso rode o `gradlew.bat` direto via PowerShell, como acima.
- **No Windows, se o projeto estiver dentro de uma pasta sincronizada pelo OneDrive**, builds do Gradle podem falhar repetidamente com `Unable to delete directory` (o OneDrive segura lock nos arquivos gerados). Sintoma: o mesmo erro se repete mesmo tentando de novo. Solução: pedir pro usuário pausar a sincronização do OneDrive (não dá pra fazer isso via terminal) e tentar de novo. Um caminho de pasta mais curto (`subst X: <pasta>`) NÃO resolve esse caso específico — o lock é por arquivo físico, não pelo tamanho do path.
- Se o erro `Unable to delete directory` acontecer mesmo sem OneDrive no caminho, pode ser uma corrida entre tasks do Gradle usando estado parcial de uma build anterior que falhou — pare os daemons (`gradlew.bat --stop`) e apague manualmente as pastas de build mencionadas no erro (`Remove-Item -Recurse -Force`) antes de tentar de novo, em vez de repetir o mesmo comando.
