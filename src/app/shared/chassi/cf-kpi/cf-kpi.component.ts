import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';

export type TomKpi = 'neutro' | 'aprovado' | 'reprovado' | 'atencao';

/**
 * STUB DO CHASSI — substituível por `<bv-indicador>` do @arqt/ng15-ui.
 *
 * Indicador da faixa superior: rótulo, valor grande, ícone em badge à direita,
 * variação contra o período anterior e um sparkline da própria métrica no
 * rodapé. O sparkline é um gráfico sem eixo, sem grade e sem tooltip — só a
 * forma da tendência, para dar contexto ao número sem competir com ele.
 */
@Component({
  selector: 'cf-kpi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cf-kpi.component.html',
  styleUrls: ['./cf-kpi.component.scss'],
})
export class CfKpiComponent implements OnChanges {
  @Input() rotulo = '';
  @Input() valor: number | null = null;
  @Input() sufixo = '';
  @Input() casasDecimais = 0;
  @Input() tom: TomKpi = 'neutro';
  @Input() carregando = false;
  /** Nome do ícone Material exibido no badge. */
  @Input() icone = 'insights';

  /** Variação percentual contra o período anterior. `null` esconde o rodapé. */
  @Input() variacaoPercentual: number | null = null;
  /**
   * Quando true, uma variação POSITIVA é ruim (caso de "% de reprovação") e o
   * indicador inverte a cor. A seta continua apontando o sentido real.
   */
  @Input() altaEhRuim = false;
  @Input() descricaoComparativo = 'vs. período anterior';

  /** Série da própria métrica, na ordem cronológica, para o sparkline. */
  @Input() serie: number[] = [];

  dadosSparkline: ChartData<'line', number[], string> = { labels: [], datasets: [] };
  opcoesSparkline: ChartConfiguration<'line'>['options'] = {};

  ngOnChanges(): void {
    this.dadosSparkline = this.montarSparkline();
    this.opcoesSparkline = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: { x: { display: false }, y: { display: false } },
      plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } },
      elements: { point: { radius: 0 } },
      // O sparkline é decorativo: não recebe evento nem rouba o hover do card.
      events: [],
    } as ChartConfiguration<'line'>['options'];
  }

  get temSparkline(): boolean {
    return this.serie.length > 1;
  }

  get variacaoEhPositiva(): boolean {
    return (this.variacaoPercentual ?? 0) > 0;
  }

  get variacaoEhNeutra(): boolean {
    const v = this.variacaoPercentual;
    return v === null || Math.abs(v) < 0.05;
  }

  /** Classe de cor do rodapé: verde quando o movimento é bom para o negócio. */
  get classeVariacao(): string {
    if (this.variacaoEhNeutra) { return 'cf-kpi__variacao--neutra'; }
    const bom = this.altaEhRuim ? !this.variacaoEhPositiva : this.variacaoEhPositiva;
    return bom ? 'cf-kpi__variacao--boa' : 'cf-kpi__variacao--ruim';
  }

  /** Texto equivalente para leitor de tela — a seta sozinha não é lida. */
  get leituraVariacao(): string {
    if (this.variacaoEhNeutra) { return 'estável em relação ao período anterior'; }
    const sentido = this.variacaoEhPositiva ? 'aumento' : 'queda';
    return `${sentido} de ${Math.abs(this.variacaoPercentual ?? 0).toFixed(1)} por cento ${this.descricaoComparativo}`;
  }

  private montarSparkline(): ChartData<'line', number[], string> {
    if (!this.temSparkline) {
      return { labels: [], datasets: [] };
    }
    // A cor acompanha o tom do card; o preenchimento é a mesma cor esmaecida,
    // resolvida via CSS custom property para seguir a paleta.
    const cor = getComputedStyle(document.documentElement)
      .getPropertyValue(`--cf-kpi-${this.tom}`)
      .trim() || '#1976d2';

    return {
      labels: this.serie.map(() => ''),
      datasets: [
        {
          data: this.serie,
          borderColor: cor,
          backgroundColor: `${cor}1f`,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }
}
