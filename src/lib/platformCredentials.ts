type CredenciaisSigilosas = {
  fonnteToken: string | null;
  evolutionApiKey: string | null;
  emailPass: string | null;
};

export function ocultarCredenciaisEmpresa<T extends CredenciaisSigilosas>(empresa: T) {
  const { fonnteToken, evolutionApiKey, emailPass, ...dadosPublicos } = empresa;

  return {
    ...dadosPublicos,
    fonnteTokenConfigurado: Boolean(fonnteToken),
    evolutionApiKeyConfigurada: Boolean(evolutionApiKey),
    emailPassConfigurada: Boolean(emailPass),
  };
}
