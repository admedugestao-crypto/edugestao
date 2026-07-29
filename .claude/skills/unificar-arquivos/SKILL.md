---
name: unificar-arquivos
description: Adiciona a um campo de upload a opção de selecionar vários arquivos (PDFs e/ou imagens) e uni-los num único PDF antes de enviar, igual ao anexo de material na Biblioteca de Apostilas. Use quando o usuário pedir para permitir múltiplos arquivos num upload existente, ou para "juntar"/"unificar" arquivos antes de anexar em qualquer cadastro do sistema.
---

# Unificar N arquivos num único PDF antes do upload

Padrão já usado no upload de material da Biblioteca de Apostilas (`src/components/BibliotecaClient.tsx`) para contornar o limite de tamanho de upload: em vez de anexar 3-4 fotos de celular enormes separadamente, o usuário seleciona todas de uma vez e o navegador as junta num único PDF (comprimindo imagens) antes de enviar para `/api/upload`.

A lógica reutilizável está em [`src/lib/unificarArquivos.ts`](../../../src/lib/unificarArquivos.ts) — **não duplique o código**, importe de lá.

## Quando usar

O usuário pede para permitir selecionar/anexar vários arquivos num campo de upload que hoje só aceita um, em qualquer tela do sistema (não só biblioteca).

## Como aplicar num componente novo

1. Import:
   ```ts
   import { TIPOS_WORD, unificarArquivos } from "@/lib/unificarArquivos";
   ```
2. No `<input type="file">`, adicione `multiple` (e mantenha `accept` cobrindo PDF, imagem e Word se aplicável).
3. No handler de `onChange`, troque `e.target.files?.[0]` por processar a lista inteira:
   ```ts
   async function selecionarArquivos(fileList: FileList | null) {
     const files = Array.from(fileList ?? []);
     if (files.length === 0) return;

     if (files.length > 1) {
       if (files.some((f) => TIPOS_WORD.includes(f.type))) {
         setErro("Não é possível unificar um arquivo Word com outros. Selecione só um arquivo Word por vez, ou combine apenas PDFs/imagens.");
         return;
       }
       setUnificando(true);
       try {
         const unico = await unificarArquivos(files);
         await enviarArquivo(unico); // fetch POST /api/upload existente
       } catch (err) {
         setErro(err instanceof Error ? err.message : "Erro ao unificar os arquivos selecionados.");
       } finally {
         setUnificando(false);
       }
       return;
     }

     await enviarArquivo(files[0]);
   }
   ```
4. Adicione um estado `unificando` e mostre um label diferente no botão ("Unificando arquivos..." / desabilitar o input) enquanto roda — junção de PDFs grandes no navegador não é instantânea.
5. `unificarArquivos` roda **inteiramente no navegador** (usa `pdf-lib`, `canvas`, `createImageBitmap`) — o componente precisa ser client component (`"use client"`), e nada disso funciona em rota de API/servidor.

## Limitações a considerar

- **Word não pode ser misturado**: `pdf-lib` só sabe montar páginas de PDF/imagem. Se o usuário selecionar um `.doc`/`.docx` junto de outros arquivos, bloqueie antes de chamar `unificarArquivos` (veja `TIPOS_WORD` acima).
- **1 arquivo só**: `unificarArquivos` retorna o próprio arquivo sem conversão se `files.length === 1` — não force conversão desnecessária de PDF único.
- **Compressão de imagem**: fotos são redimensionadas para no máximo 1800px no maior lado e reencodadas em JPEG qualidade 0.75 antes de entrar no PDF (constantes `MAX_LADO`/`QUALIDADE_JPEG` em `unificarArquivos.ts`) — isso é o que evita estourar o limite de upload ao juntar várias fotos de celular.
- **Paridade mobile**: hoje só o componente desktop (`BibliotecaClient.tsx`) tem essa unificação; `BibliotecaMobile.tsx` ainda aceita só 1 arquivo por vez (`e.target.files?.[0]`). Se o pedido for para habilitar unificação também no mobile, aplique o mesmo padrão lá e consulte o agente `paridade-mobile`.
- **Erro de arquivo individual**: se um arquivo específico falhar ao processar (corrompido, PDF criptografado sem senha, etc.), `unificarArquivos` lança erro citando o nome do arquivo — não precisa de tratamento extra, só exiba `err.message`.

## Checklist final

- [ ] Import de `@/lib/unificarArquivos`, sem copiar o código.
- [ ] Input com `multiple`.
- [ ] Bloqueio de mistura com Word antes de chamar `unificarArquivos`.
- [ ] Estado de loading (`unificando`) desabilitando o input durante o processamento.
- [ ] Testado manualmente selecionando 2+ arquivos (PDF + imagem) e confirmando que gera um único PDF com todas as páginas na ordem certa.
