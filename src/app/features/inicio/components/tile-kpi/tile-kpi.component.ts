import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ChartConfiguration, ChartData } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { LeitorPaletaService } from '../../../../core/services/leitor-paleta.service';
import { ChassiModule } from '../../../../shared/chassi/chassi.module';
import { TomKpi } from '../../../../shared/chassi/cf-kpi/cf-kpi.component';
import { ContagemDirective } from '../../diretivas/contagem.directive';
import { UnidadeVariacao, Variacao } from '../../models/variacao';

const EXTENSO: Record<UnidadeVariacao, string> = { '%': 'por cento', 'p.p.': 'pontos percentuais', s: 'segundos' };

/**
 * KPI da Home (dumb). Próprio da feature para não alterar o stub `cf-kpi` da
 * página executiva. Com `pista`, o card inteiro vira um botão que abre um
 * detalhe (`acionado`); o texto de leitor de tela traz rótulo e valor.
 */
@Component({
  selector: 'ini-tile-kpi',
  standalone: true,
  imports: [CommonModule, MatIconModule, NgChartsModule, ChassiModule, ContagemDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tile-kpi.component.html',
  styleUrls: ['./tile-kpi.component.scss'],
})
export class TileKpiComponent implements OnChanges {
  @Input() rotulo = '';
  @Input() valor: number | null = null;
  @Input() sufixo = '';
  @Input() casas = 0;
  @Input() tom: TomKpi = 'neutro';
  @Input() icone = 'insights';
  /** URL de uma imagem decorativa que substitui o ícone no selo. */
  @Input() logo = '';
  @Input() carregando = false;
  @Input() variacao: Variacao | null = null;
  /** Variação positiva é ruim (tempo médio): inverte a cor, a seta segue o sentido real. */
  @Input() altaEhRuim = false;
  @Input() comparativo = '';
  @Input() serie: number[] = [];
  @Input() detalhe = '';
  /** Texto do convite à ação ("Ver mês a mês"). Vazio = card não clicável. */
  @Input() pista = '';
  @Output() acionado = new EventEmitter<void>();

  dadosSparkline: ChartData<'line', number[], string> = { labels: [], datasets: [] };
  readonly opcoesSparkline = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: { x: { display: false }, y: { display: false } },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    elements: { point: { radius: 0 } },
    events: [],
  } as ChartConfiguration<'line'>['options'];

  constructor(private readonly paleta: LeitorPaletaService) {}

  ngOnChanges(): void {
    this.dadosSparkline = this.montarSparkline();
  }

  get temSparkline(): boolean {
    return this.serie.length > 1;
  }

  get positiva(): boolean {
    return (this.variacao?.valor ?? 0) > 0;
  }

  get neutra(): boolean {
    return !this.variacao || Math.abs(this.variacao.valor) < 0.05;
  }

  get classeVariacao(): string {
    if (this.neutra) { return 'tile__variacao--neutra'; }
    return (this.altaEhRuim ? !this.positiva : this.positiva) ? 'tile__variacao--boa' : 'tile__variacao--ruim';
  }

  get icoVariacao(): string {
    return this.neutra ? 'trending_flat' : this.positiva ? 'trending_up' : 'trending_down';
  }

  get textoVariacao(): string {
    if (!this.variacao) { return ''; }
    const sinal = this.variacao.valor > 0 ? '+' : '';
    const casas = this.variacao.unidade === 's' ? 0 : 1;
    const numero = this.numero(this.variacao.valor, casas, casas);
    return `${sinal}${numero}${this.variacao.unidade === '%' ? '%' : ` ${this.variacao.unidade}`}`;
  }

  get leituraVariacao(): string {
    if (!this.variacao) { return ''; }
    if (this.neutra) { return `estável ${this.comparativo}`.trim(); }
    const sentido = this.positiva ? 'aumento' : 'queda';
    const casas = this.variacao.unidade === 's' ? 0 : 1;
    return `${sentido} de ${this.numero(Math.abs(this.variacao.valor), casas, casas)} ${EXTENSO[this.variacao.unidade]} ${this.comparativo}`.trim();
  }

  get leitura(): string {
    const v = this.valor === null ? 'indisponível' : `${this.numero(this.valor, this.casas, this.casas)}${this.sufixo}`;
    return `${this.rotulo}: ${v}. ${this.pista}`;
  }

  private numero(valor: number, min: number, max: number): string {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max }).format(valor);
  }

  private montarSparkline(): ChartData<'line', number[], string> {
    if (!this.temSparkline) {
      return { labels: [], datasets: [] };
    }
    const cor = this.paleta.token(`--cf-kpi-${this.tom}`, '#1976d2');
    return {
      labels: this.serie.map(() => ''),
      datasets: [{
        data: this.serie,
        borderColor: cor,
        backgroundColor: this.paleta.comOpacidade(cor, 0.12),
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      }],
    };
  }
}
