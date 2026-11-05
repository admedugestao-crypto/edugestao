// Somente códigos e mensagens conhecidos podem sair do servidor.
export function diagnosticarSmtp(falha: unknown, etapa: "configuracao" | "smtp") {
  const dados = falha && typeof falha === "object" ? falha as Record<string, unknown> : {};
  const codigo = typeof dados.code === "string" ? dados.code : "";
  const resultado = (codigo: string, erro: string) => ({ codigo, erro });
  if (codigo === "SMTP_SEM_CONFIGURACAO") return resultado(codigo, "Nenhuma configuração de e-mail foi encontrada. Salve os dados antes de testar.");
  if (codigo === "SMTP_CREDENCIAL_ILEGIVEL") return resultado(codigo, "Não foi possível ler a senha salva. Informe novamente a senha SMTP e salve a configuração. Se persistir, a equipe deve verificar a configuração de segurança da plataforma.");
  if (etapa === "configuracao") return resultado("SMTP_CONFIGURACAO_INDISPONIVEL", "Não foi possível carregar a configuração salva. Verifique a disponibilidade do banco de dados da plataforma.");
  if (codigo === "EAUTH" || dados.responseCode === 535 || dados.responseCode === 534) return resultado("SMTP_AUTENTICACAO", "O provedor recusou a autenticação. Confira o usuário e a senha de aplicativo da mesma conta. No Gmail, a senha comum de acesso não substitui a senha de aplicativo.");
  if (codigo === "ETIMEDOUT" || codigo === "ESOCKETTIMEDOUT") return resultado("SMTP_TEMPO_ESGOTADO", "O servidor SMTP não respondeu no prazo. Verifique host, porta e a liberação de conexão de saída no ambiente de hospedagem.");
  if (["EDNS", "ENOTFOUND", "EAI_AGAIN"].includes(codigo)) return resultado("SMTP_DNS", "Não foi possível localizar o servidor SMTP. Confira o host informado; também pode haver uma falha temporária de DNS.");
  if (["ETLS", "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "ERR_TLS_CERT_ALTNAME_INVALID", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"].includes(codigo)) return resultado("SMTP_TLS", "Falha na conexão segura com o servidor SMTP. Confira o host e a porta: 465 usa TLS direto; 587 usa STARTTLS. O certificado do provedor também deve ser válido.");
  if (["ECONNECTION", "ECONNREFUSED", "ECONNRESET", "ESOCKET", "EHOSTUNREACH", "ENETUNREACH"].includes(codigo)) return resultado("SMTP_CONEXAO", "Não foi possível manter a conexão com o servidor SMTP. Confira host, porta e possíveis bloqueios de rede no provedor ou na hospedagem.");
  return resultado("SMTP_FALHA_NAO_IDENTIFICADA", "O teste SMTP falhou sem uma causa identificada. Solicite à equipe técnica uma verificação do provedor e da conexão da plataforma.");
}
