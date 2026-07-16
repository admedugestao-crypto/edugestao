import type { CapacitorConfig } from '@capacitor/cli';

// O app é Next.js server-rendered (não dá pra fazer export estático), então
// o Capacitor não empacota o conteúdo — ele abre a URL de produção dentro
// de uma WebView nativa. `webDir` fica apontando pra pasta public só porque
// o Capacitor exige o campo, mas na prática server.url é o que manda.
const config: CapacitorConfig = {
  appId: 'br.com.edugestao.app',
  appName: 'EduGestão',
  webDir: 'public',
  server: {
    url: 'https://edugestao-bj4p.vercel.app/m',
    androidScheme: 'https',
  },
};

export default config;
