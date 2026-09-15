import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { KpisDto, PontoSerieTemporalDto } from '../../models/graficos-executivos.dto';

/** Uma variação percentual já calculada contra o período anterior. */
function variacao(atual: number, anterior: number | undefined): number | null {
  if (anterior === undefined) {
    return null;
  }
  if (anterior === 0) {
    return atual === 0 ? 0 : null; // crescimento a partir de zero não tem % útil
  }
  return ((atual - anterior) / anterior) * 100;
}

/**
 * Faixa superior de indicadores (dumb):
 * Total de Peças · Peças Aprovadas · Reprovadas · % de Reprovação.
 *
 * Quando o payload traz `periodoAnterior`, cada indicador ganha o comparativo
 * com a seta de tendência.
 */
@Component({
  selector: 'gx-faixa-kpis',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './faixa-kpis.component.html',
  styleUrls: ['./faixa-kpis.component.scss'],
})
export class FaixaKpisComponent {
  @Input() kpis: KpisDto | null = null;
  @Input() carregando = false;
  /** Série temporal do dashboard, reaproveitada para os sparklines dos cards. */
  @Input() serie: PontoSerieTemporalDto[] = [];

  get serieTotal(): number[] {
    return this.serie.map((p) => p.aprovadas + p.reprovadas);
  }

  get serieAprovadas(): number[] {
    return this.serie.map((p) => p.aprovadas);
  }

  get serieReprovadas(): number[] {
    return this.serie.map((p) => p.reprovadas);
  }

  get seriePercentual(): number[] {
    return this.serie.map((p) => p.percentualReprovacao);
  }

  get variacaoTotal(): number | null {
    return this.kpis ? variacao(this.kpis.totalPecas, this.kpis.periodoAnterior?.totalPecas) : null;
  }

  get variacaoAprovadas(): number | null {
    return this.kpis ? variacao(this.kpis.pecasAprovadas, this.kpis.periodoAnterior?.pecasAprovadas) : null;
  }

  get variacaoReprovadas(): number | null {
    return this.kpis ? variacao(this.kpis.pecasReprovadas, this.kpis.periodoAnterior?.pecasReprovadas) : null;
  }

  /**
   * Para o percentual, o comparativo é a diferença em PONTOS PERCENTUAIS, não a
   * variação relativa — é o que a leitura executiva espera (de 20% para 24% é
   * "+4 p.p.", e não "+20%").
   */
  get variacaoPercentualReprovacao(): number | null {
    const anterior = this.kpis?.periodoAnterior?.percentualReprovacao;
    if (!this.kpis || anterior === undefined) {
      return null;
    }
    return this.kpis.percentualReprovacao - anterior;
  }
}
