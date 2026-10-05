/**
 * Query params do atalho "Últimos 30 dias" para o Gráfico Executivo — mesmo
 * contrato de `FiltrosGraficos` (`de`/`ate`/`granularidade`) da outra feature,
 * mas SEM importá-la: cada feature é um pacote portável independente (ver
 * README, "Pontos de integração").
 */
export interface QueryParamsPeriodoRecente {
  de: string;
  ate: string;
  granularidade: 'dia';
}

function paraIsoData(data: Date): string {
  const ano = data.getFullYear();
  const mes = `${data.getMonth() + 1}`.padStart(2, '0');
  const dia = `${data.getDate()}`.padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function ultimosDias(dias: number, hoje = new Date()): QueryParamsPeriodoRecente {
  const de = new Date(hoje);
  de.setDate(de.getDate() - (dias - 1));
  return { de: paraIsoData(de), ate: paraIsoData(hoje), granularidade: 'dia' };
}
