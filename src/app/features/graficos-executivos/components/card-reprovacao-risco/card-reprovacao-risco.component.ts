import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { ChartConfiguration, ChartData, Plugin } from 'chart.js';
import { LeitorPaletaService } from '../../../../core/services/leitor-paleta.service';
import { ReprovacaoPorRiscoDto } from '../../models/graficos-executivos.dto';

/** Uma fatia do donut, já com a cor resolvida — usado pela legenda abaixo. */
export interface FatiaRisco extends ReprovacaoPorRiscoDto {
  cor: string;
  /** Participação deste risco no total de reprovadas (não a taxa dele). */
  percentualDoTotal: number;
}

/**
 * Card 1 — Reprovação por risco atrelado.
 *
 * Donut de COMPOSIÇÃO: de tudo que foi reprovado, quanto veio de cada tipo de
 * risco — não a taxa de cada risco (essa é outra pergunta, e segue disponível
 * no tooltip e na tabela alternativa).
 *
 * Redesenho minimalista: o total e a variação vs. período anterior vivem no
 * PRÓPRIO vazado do donut — é o espaço que a forma já oferece, então usar essa
 * área em vez de repetir o número numa faixa de texto separada corta uma
 * camada inteira do card. A legenda vira uma lista de UMA linha por risco
 * (bolinha + rótulo à esquerda, % e contagem à direita), no mesmo padrão de
 * linha usado nos cards "Origem × resultado" e "Total por produto".
 *
 * As cores das fatias vêm da paleta categórica: o risco atrelado é um TIPO de
 * risco (Compliance, Jurídico, Operacional, Conduta), não mais uma escala
 * ordinal de severidade — por isso não há gradiente de gravidade aqui.
 */
@Component({
  selector: 'gx-card-reprovacao-risco',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-reprovacao-risco.component.html',
  styleUrls: ['./card-reprovacao-risco.component.scss'],
})
export class CardReprovacaoRiscoComponent implements OnChanges {
  @Input() itens: ReprovacaoPorRiscoDto[] = [];
  /** Total de reprovadas no período imediatamente anterior, de igual duração. */
  @Input() reprovadasPeriodoAnterior: number | null = null;
  /** Risco que está recortando a página, quando há exatamente um. */
  @Input() selecionado: string | null = null;

  /** Cross-filter: clicar numa fatia ou na legenda recorta a página inteira. */
  @Output() riscoAlternado = new EventEmitter<string>();

  dados: ChartData<'doughnut', number[], string> = { labels: [], datasets: [] };
  opcoes: ChartConfiguration<'doughnut'>['options'] = {};
  fatias: FatiaRisco[] = [];
  totalReprovadas = 0;
  variacaoGeral: number | null = null;
  readonly plugins: Plugin<'doughnut'>[] = [this.pluginTotalCentral()];

  constructor(private readonly paleta: LeitorPaletaService) {}

  ngOnChanges(): void {
    // Padrão da página: maior % para o menor. Este card exibe a % de
    // COMPOSIÇÃO (participação no total de reprovadas), não a taxa de
    // reprovação do risco — ordenar por `reprovadas` é equivalente (mesmo
    // denominador em todos os itens) e mantém a ordem da lista igual à ordem
    // visual dos números na tela, em vez de ordenar por uma métrica que só
    // aparece no tooltip.
    const ordenados = [...this.itens].sort((a, b) => b.reprovadas - a.reprovadas);
    const cores = this.paleta.serieCategorica();

    this.totalReprovadas = ordenados.reduce((soma, item) => soma + item.reprovadas, 0);
    this.variacaoGeral = this.variacao(this.totalReprovadas, this.reprovadasPeriodoAnterior);

    this.fatias = ordenados.map((item, i) => ({
      ...item,
      cor: cores[i % cores.length] as string,
      percentualDoTotal: this.totalReprovadas
        ? Math.round((item.reprovadas / this.totalReprovadas) * 1000) / 10
        : 0,
    }));

    this.dados = {
      labels: this.fatias.map((f) => f.rotulo),
      datasets: [
        {
          data: this.fatias.map((f) => f.reprovadas),
          // Fatia fora do recorte recua; a selecionada fica cheia — mesma
          // linguagem do cross-filter do gráfico principal.
          backgroundColor: this.fatias.map((f) =>
            !this.selecionado || this.selecionado === f.chave
              ? f.cor
              : this.paleta.comOpacidade(f.cor, 0.3),
          ),
          borderColor: this.paleta.token('--cf-superficie', '#ffffff'),
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };

    this.opcoes = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false }, // a legenda própria (com contagem) fica no template
        tooltip: {
          backgroundColor: this.paleta.tooltipFundo,
          callbacks: {
            label: (contexto) => {
              const fatia = this.fatias[contexto.dataIndex];
              if (!fatia) { return ''; }
              return ` ${fatia.rotulo}: ${fatia.reprovadas} peças (${fatia.percentualDoTotal.toFixed(1)}% das reprovadas, `
                + `${fatia.percentualReprovacao.toFixed(1)}% de taxa no risco)`;
            },
          },
        },
      },
    };
  }

  /**
   * Clique na rosca: numa fatia, recorta por ela; fora de qualquer fatia,
   * limpa o recorte — é o "clicar fora volta ao padrão" dentro do próprio
   * gráfico.
   */
  aoClicarNoGrafico(evento: { active?: Array<{ index?: number }> }): void {
    const indice = evento.active?.[0]?.index;
    if (indice === undefined) {
      if (this.selecionado) {
        this.riscoAlternado.emit(this.selecionado);
      }
      return;
    }
    const fatia = this.fatias[indice];
    if (fatia) {
      this.riscoAlternado.emit(fatia.chave);
    }
  }

  get descricaoAcessivel(): string {
    if (!this.itens.length) {
      return 'Gráfico sem dados.';
    }
    const maior = [...this.fatias].sort((a, b) => b.reprovadas - a.reprovadas)[0];
    const tendencia = this.variacaoGeral === null
      ? ''
      : ` Variação de ${this.variacaoGeral.toFixed(1)} por cento vs. período anterior.`;
    return `Gráfico de rosca com a composição das ${this.totalReprovadas} peças reprovadas por tipo de risco atrelado.`
      + `${tendencia} Maior fatia: ${maior?.rotulo}, com ${maior?.percentualDoTotal.toFixed(1)} por cento.`;
  }

  private variacao(total: number, anterior: number | null): number | null {
    if (anterior === null) {
      return null;
    }
    if (anterior === 0) {
      return total === 0 ? 0 : null; // crescimento a partir de zero não tem % útil
    }
    return Math.round(((total - anterior) / anterior) * 1000) / 10;
  }

  /**
   * Desenha o total de reprovadas e a variação vs. período anterior dentro do
   * vazado do donut — usa o espaço que a própria forma oferece em vez de uma
   * faixa de texto à parte. Cor da variação segue a mesma semântica invertida
   * do resto do card: queda de reprovadas é boa (verde), alta é ruim (vermelho).
   */
  private pluginTotalCentral(): Plugin<'doughnut'> {
    return {
      id: 'totalCentral',
      afterDraw: (chart) => {
        const { ctx, chartArea } = chart;
        if (!chartArea) { return; }
        const centroX = (chartArea.left + chartArea.right) / 2;
        const centroY = (chartArea.top + chartArea.bottom) / 2;
        const temVariacao = this.variacaoGeral !== null;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = this.paleta.token('--cf-texto', '#212121');
        ctx.font = '700 26px Roboto, sans-serif';
        ctx.fillText(`${this.totalReprovadas}`, centroX, centroY + (temVariacao ? -15 : 0));

        if (temVariacao) {
          const variacao = this.variacaoGeral as number;
          const seta = variacao === 0 ? '•' : variacao < 0 ? '↓' : '↑';
          const boa = variacao <= 0; // queda ou estável = bom para reprovadas
          ctx.fillStyle = boa
            ? this.paleta.token('--cf-aprovado', '#2e7d32')
            : this.paleta.token('--cf-reprovado', '#c62828');
          ctx.font = '700 12px Roboto, sans-serif';
          const sinal = variacao > 0 ? '+' : '';
          ctx.fillText(`${seta} ${sinal}${variacao.toFixed(1)}%`, centroX, centroY + 8);

          // Terceira linha, bem pequena: cabe no vazado sem esticar o layout
          // já construído (donut e legenda permanecem exatamente como estão).
          ctx.fillStyle = this.paleta.token('--cf-texto-secundario', '#666666');
          ctx.font = '500 9px Roboto, sans-serif';
          ctx.fillText('vs per. anterior', centroX, centroY + 21);
        } else {
          ctx.fillStyle = this.paleta.token('--cf-texto-secundario', '#666666');
          ctx.font = '500 11px Roboto, sans-serif';
          ctx.fillText('reprovadas', centroX, centroY + 14);
        }

        ctx.restore();
      },
    };
  }
}
