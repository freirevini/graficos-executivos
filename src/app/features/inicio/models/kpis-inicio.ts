import { competenciaDe } from './competencia';
import { PontoMensalInicioDto, ResumoInicioDto } from './inicio.dto';
import { Variacao, variacaoEmPontos, variacaoEmSegundos, variacaoPercentual } from './variacao';

export interface KpiInicio {
  valor: number;
  /** Só meses fechados: o mês corrente é parcial e pareceria uma queda falsa. */
  serie: number[];
  variacao: Variacao | null;
  /** Ex.: "ago/26 vs. jul/26". Vazio quando não há variação. */
  comparativo: string;
}

export interface KpisInicio {
  analises: KpiInicio;
  conformidade: KpiInicio;
  tempoMedio: KpiInicio;
}

const taxa = (p: PontoMensalInicioDto): number => (p.total > 0 ? (p.aprovadas / p.total) * 100 : 0);

/**
 * KPIs da Home a partir do resumo. A variação compara o último mês FECHADO com o
 * anterior (decisão D3-a): nenhum campo novo no contrato do BFF.
 */
export function montarKpis(resumo: ResumoInicioDto, hoje = new Date()): KpisInicio {
  const atual = competenciaDe(hoje);
  const fechados = resumo.serieMensal.filter((p) => p.competencia < atual);
  const ultimo = fechados[fechados.length - 1];
  const anterior = fechados[fechados.length - 2];
  const comPar = !!ultimo && !!anterior && ultimo.total > 0 && anterior.total > 0;
  const comparativo = comPar ? `${ultimo.rotulo} vs. ${anterior.rotulo}` : '';

  return {
    analises: {
      valor: resumo.uso.pecasAnalisadas,
      serie: fechados.map((p) => p.total),
      variacao: ultimo && anterior ? variacaoPercentual(ultimo.total, anterior.total) : null,
      comparativo: ultimo && anterior && anterior.total > 0 ? `${ultimo.rotulo} vs. ${anterior.rotulo}` : '',
    },
    conformidade: {
      valor: resumo.uso.percentualConformidade,
      serie: fechados.filter((p) => p.total > 0).map((p) => Math.round(taxa(p) * 10) / 10),
      variacao: comPar ? variacaoEmPontos(taxa(ultimo), taxa(anterior)) : null,
      comparativo,
    },
    tempoMedio: {
      valor: resumo.uso.tempoMedioSegundos,
      serie: fechados.filter((p) => p.total > 0).map((p) => p.tempoMedioSegundos),
      variacao: comPar ? variacaoEmSegundos(ultimo.tempoMedioSegundos, anterior.tempoMedioSegundos) : null,
      comparativo,
    },
  };
}
