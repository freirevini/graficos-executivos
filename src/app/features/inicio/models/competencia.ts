/** Competência `YYYY-MM` no fuso local, a mesma chave de `PontoMensalInicioDto.competencia`. */
export function competenciaDe(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}
