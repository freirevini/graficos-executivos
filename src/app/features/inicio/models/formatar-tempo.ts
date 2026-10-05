/** Ex.: `32s`, `5min`, `5min 3s`. Usado em qualquer exibição de tempo médio de análise. */
export function formatarTempo(segundos: number): string {
  if (segundos < 60) {
    return `${Math.round(segundos)}s`;
  }
  const minutos = Math.floor(segundos / 60);
  const resto = Math.round(segundos % 60);
  return resto > 0 ? `${minutos}min ${resto}s` : `${minutos}min`;
}
