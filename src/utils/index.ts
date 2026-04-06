/**
 * @deprecated Utilitario legado sem consumidores no app atual.
 * Mantido para compatibilidade com integracoes externas.
 */
export function createPageUrl(pageName: string) {
  return '/' + pageName.replace(/ /g, '-');
}