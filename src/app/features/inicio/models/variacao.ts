export type UnidadeVariacao = '%' | 'p.p.' | 's';

export interface Variacao {
  valor: number;
  unidade: UnidadeVariacao;
}

function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

/** Variação relativa em %. `null` quando a base é zero (não existe "+∞%"). */
export function variacaoPercentual(atual: number, anterior: number): Variacao | null {
  if (anterior <= 0) {
    return null;
  }
  return { valor: arredondar(((atual - anterior) / anterior) * 100, 1), unidade: '%' };
}

/** Diferença entre duas taxas, em pontos percentuais. */
export function variacaoEmPontos(atual: number, anterior: number): Variacao {
  return { valor: arredondar(atual - anterior, 1), unidade: 'p.p.' };
}

/** Diferença absoluta em segundos. */
export function variacaoEmSegundos(atual: number, anterior: number): Variacao {
  return { valor: Math.round(atual - anterior), unidade: 's' };
}
