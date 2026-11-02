import { CONFIRMACAO_INSCRICAO } from "./inscricaoTeste";

export function mensagemConfirmacaoInscricao(nome: string) {
  return {
    subject: "Recebemos sua inscrição — EG V2",
    text: `Olá, ${nome}!\n\n${CONFIRMACAO_INSCRICAO}\n\nSua inscrição foi registrada, mas ainda não representa aprovação para uma das 5 vagas. A equipe entrará em contato pelo WhatsApp informado.\n\nDurante o teste, os participantes usarão o EG V2 na sua rotina, reportarão problemas ao suporte do app e compartilharão sugestões de melhoria.\n\nEquipe EG V2`,
  };
}
