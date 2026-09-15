import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { ChartConfiguration, ChartData, ChartDataset, Plugin } from 'chart.js';
import DataLabelsPlugin, { Context as ContextoRotulo } from 'chartjs-plugin-datalabels';
import { LeitorPaletaService } from '../../../../core/services/leitor-paleta.service';
import { Granularidade } from '../../models/filtros.model';
import { PontoSerieTemporalDto } from '../../models/graficos-executivos.dto';

/** Payload do (chartClick) do ng2-charts, com o mínimo que consumimos. */
interface CliqueGrafico {
  active?: Array<{ index?: number }>;
}

/** Geometria mínima que lemos dos elementos de barra e de ponto do Chart.js. */
interface GeometriaBarra {
  x: number;
  y: number;
  base?: number;
}

/** Elemento do Chart.js na parte que usamos: as props resolvidas da marca. */
interface LeitorDeGeometria {
  getProps?: (props: string[], final?: boolean) => Partial<GeometriaBarra>;
}

/**
 * Altura mínima, EM PIXELS, para um número caber dentro do segmento com folga.
 * Medir em pixel (e não em unidades de dado) é o que impede o rótulo de ser
 * espremido quando a escala muda entre os filtros de período.
 */
const ALTURA_MINIMA_ROTULO_PX = 18;

/** Teto de espessura da coluna; abaixo disso ela acompanha a banda. */
const ESPESSURA_MAXIMA_BARRA = 84;

/** Opacidade das colunas fora do recorte selecionado no cross-filter. */
const OPACIDADE_NAO_SELECIONADO = 0.32;

/**
 * VOLUME AVALIADO × TAXA DE REPROVAÇÃO — bloco principal.
 *
 * Barras empilhadas (aprovadas/reprovadas) com a taxa de reprovação sobreposta
 * em linha. Responde "o volume cresceu, mas a qualidade piorou?".
 *
 * DECISÕES DE LEITURA
 *
 * 1. Escala da taxa em PATAMARES FIXOS de 25 (0-25/50/75/100), nunca relativa
 *    ao pico do recorte. Com escala relativa, a mesma taxa de 25% aparecia em
 *    alturas diferentes só por trocar o filtro de período — a linha "subia"
 *    sem o dado ter mudado. Em patamares, a altura só muda quando a taxa
 *    realmente cruza um patamar, e os períodos ficam comparáveis entre si.
 * 2. Grade horizontal hairline no lugar dos eixos numéricos: devolve a noção
 *    de magnitude que o rótulo sozinho não dá, sem trazer de volta os números
 *    de eixo.
 * 3. Separação por RESPIRO, não por traço: 2px na cor da superfície entre os
 *    segmentos empilhados, em vez de contorno desenhado em volta da marca.
 * 4. Seleção do cross-filter é por contraste (as outras colunas recuam), não
 *    por moldura preta em volta da coluna escolhida.
 *
 * CROSS-FILTER: clicar numa coluna seleciona aquele período e re-filtra a
 * página inteira. Clicar de novo desfaz. Componente dumb — só emite
 * `periodoAlternado`; quem propaga é o container via store.
 */
@Component({
  selector: 'gx-grafico-correlacao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grafico-correlacao.component.html',
  styleUrls: ['./grafico-correlacao.component.scss'],
})
export class GraficoCorrelacaoComponent implements OnChanges {
  @Input() serie: PontoSerieTemporalDto[] = [];
  @Input() periodoSelecionado: string | null = null;
  @Input() granularidade: Granularidade = 'mes';

  @Output() periodoAlternado = new EventEmitter<string>();

  dados: ChartData<'bar', number[], string> = { labels: [], datasets: [] };
  opcoes: ChartConfiguration<'bar'>['options'] = {};
  readonly plugins: Plugin<'bar'>[] = [
    DataLabelsPlugin as Plugin<'bar'>,
    this.pluginMarcadorDeColuna(),
    this.pluginTotalPorColuna(),
  ];

  constructor(private readonly paleta: LeitorPaletaService) {}

  ngOnChanges(): void {
    this.dados = this.montarDados();
    this.opcoes = this.montarOpcoes();
  }

  get unidadePeriodo(): string {
    return this.granularidade === 'dia' ? 'dias' : 'meses';
  }

  get descricaoAcessivel(): string {
    if (!this.serie.length) {
      return 'Gráfico sem dados.';
    }
    const total = this.serie.reduce((soma, p) => soma + p.aprovadas + p.reprovadas, 0);
    const pior = [...this.serie].sort((a, b) => b.percentualReprovacao - a.percentualReprovacao)[0];
    return `Gráfico de barras empilhadas com linha sobreposta, cobrindo ${this.serie.length} `
      + `${this.unidadePeriodo} e ${total} peças avaliadas. Maior taxa de reprovação em `
      + `${pior?.rotulo}, com ${pior?.percentualReprovacao.toFixed(1)} por cento.`;
  }

  aoClicar(evento: CliqueGrafico): void {
    const indice = evento.active?.[0]?.index;
    if (indice === undefined) {
      return;
    }
    const ponto = this.serie[indice];
    if (ponto) {
      this.periodoAlternado.emit(ponto.periodo);
    }
  }

  /** Teto da escala da taxa, arredondado para o próximo patamar de 25. */
  private get tetoPercentual(): number {
    const maior = this.serie.reduce((max, p) => Math.max(max, p.percentualReprovacao), 0);
    return Math.min(100, Math.max(25, Math.ceil(maior / 25) * 25));
  }

  private estaOpaco(periodo: string): boolean {
    return !this.periodoSelecionado || this.periodoSelecionado === periodo;
  }

  private montarDados(): ChartData<'bar', number[], string> {
    const superficie = this.paleta.token('--cf-superficie', '#ffffff');
    const aprovadas = this.paleta.aprovada;
    const reprovadas = this.paleta.reprovada;
    const linha = this.paleta.linhaPercentual;

    const tonalizar = (cor: string, periodo: string): string =>
      this.estaOpaco(periodo) ? cor : this.paleta.comOpacidade(cor, OPACIDADE_NAO_SELECIONADO);

    const datasetPercentual = {
      type: 'line',
      label: '% de reprovação',
      data: this.serie.map((p) => p.percentualReprovacao),
      yAxisID: 'percentual',
      borderColor: linha,
      backgroundColor: linha,
      // Anel de 2px na cor da superfície: mantém o ponto legível onde ele
      // cruza a própria linha ou o topo de uma coluna.
      pointBackgroundColor: this.serie.map((p) => tonalizar(linha, p.periodo)),
      pointBorderColor: superficie,
      pointBorderWidth: 2,
      pointRadius: this.serie.map((p) => (this.periodoSelecionado === p.periodo ? 6 : 4)),
      pointHoverRadius: 7,
      pointHoverBorderWidth: 2,
      borderWidth: 2,
      // Tracejada: distingue a taxa (uma razão, derivada) do volume medido nas
      // colunas, sem precisar de mais uma cor.
      borderDash: [7, 5],
      borderCapStyle: 'butt' as const,
      borderJoinStyle: 'round' as const,
      tension: 0.35,
      order: 0,
      datalabels: {
        // Um rótulo por ponto: sem o eixo direito, a linha precisa deles para
        // ter escala. `display: true` (e não 'auto') porque 'auto' escondia a
        // % de vários períodos quando a linha ficava achatada; o `align`
        // alterna cima/baixo para os vizinhos próximos não colidirem.
        display: (contexto: ContextoRotulo) =>
          (contexto.dataset.data[contexto.dataIndex] as number) > 0,
        align: (contexto: ContextoRotulo) => this.alinhamentoRotuloLinha(contexto.dataIndex),
        anchor: (contexto: ContextoRotulo) =>
          this.alinhamentoRotuloLinha(contexto.dataIndex) === 'bottom' ? 'start' : 'end',
        offset: 7,
        // Texto em tinta, nunca na cor da série: a cor da linha ao lado já
        // carrega a identidade, e âmbar como texto não teria contraste.
        color: this.paleta.token('--cf-texto', '#212121'),
        backgroundColor: 'rgba(255, 255, 255, 0.90)',
        borderRadius: 3,
        padding: { top: 2, bottom: 2, left: 4, right: 4 },
        font: { size: 10, weight: 600 as const },
        formatter: (valor: number) => `${valor.toFixed(0)}%`,
      },
    } as unknown as ChartDataset<'bar', number[]>;

    const rotuloDentroDaBarra = {
      // Só imprime o número quando o segmento realmente comporta o texto com
      // folga — medido no pixel, para o rótulo nunca sair espremido quando o
      // filtro muda a escala.
      display: (contexto: ContextoRotulo) => this.segmentoComportaRotulo(contexto),
      color: '#ffffff',
      font: { size: 10, weight: 600 as const },
      formatter: (valor: number) => `${valor}`,
    };

    const baseBarra = {
      stack: 'pecas',
      order: 1,
      maxBarThickness: ESPESSURA_MAXIMA_BARRA,
      // A coluna ocupa a maior parte da banda em vez de uma faixa estreita no
      // meio dela; o teto acima impede que vire um bloco nas visões com
      // poucos períodos.
      categoryPercentage: 0.9,
      barPercentage: 0.92,
      borderColor: superficie,
      datalabels: rotuloDentroDaBarra,
    };

    return {
      labels: this.serie.map((p) => p.rotulo),
      datasets: [
        {
          ...baseBarra,
          label: 'Aprovadas',
          data: this.serie.map((p) => p.aprovadas),
          backgroundColor: this.serie.map((p) => tonalizar(aprovadas, p.periodo)),
          borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
          borderWidth: 0,
        },
        {
          ...baseBarra,
          label: 'Reprovadas',
          data: this.serie.map((p) => p.reprovadas),
          backgroundColor: this.serie.map((p) => tonalizar(reprovadas, p.periodo)),
          borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
          // Respiro de 2px na cor da superfície entre os dois segmentos, em
          // vez de um traço desenhado em volta da marca.
          borderWidth: { top: 0, right: 0, bottom: 2, left: 0 },
        },
        datasetPercentual,
      ],
    } as ChartData<'bar', number[], string>;
  }

  /** Altura em pixels do segmento, para decidir se o número cabe dentro dele. */
  private segmentoComportaRotulo(contexto: ContextoRotulo): boolean {
    const valor = contexto.dataset.data[contexto.dataIndex] as number;
    if (!valor) {
      return false;
    }
    const elemento = contexto.chart
      .getDatasetMeta(contexto.datasetIndex)
      .data[contexto.dataIndex] as unknown as LeitorDeGeometria | undefined;
    // `getProps` é a API que devolve as props resolvidas do elemento; ler
    // `.base` direto vem `undefined` enquanto a animação não terminou, o que
    // fazia o rótulo nunca aparecer.
    const geometria = elemento?.getProps?.(['base', 'y'], true);
    if (!geometria || geometria.base === undefined || geometria.y === undefined) {
      return false;
    }
    return Math.abs(geometria.base - geometria.y) >= ALTURA_MINIMA_ROTULO_PX;
  }

  /**
   * Decide se o chip de % de um ponto fica acima ou abaixo da linha. Por
   * padrão todos ficam em cima; só alterna quando o valor está perto de um
   * vizinho imediato (linha "achatada" num trecho), caso em que dois chips
   * lado a lado na mesma altura colidiriam — o índice par/ímpar garante que
   * vizinhos nessa faixa nunca caiam na mesma posição.
   */
  private alinhamentoRotuloLinha(indice: number): 'top' | 'bottom' {
    const atual = this.serie[indice]?.percentualReprovacao;
    if (atual === undefined) {
      return 'top';
    }
    const vizinhos = [
      this.serie[indice - 1]?.percentualReprovacao,
      this.serie[indice + 1]?.percentualReprovacao,
    ].filter((valor): valor is number => valor !== undefined);

    const pertoDeUmVizinho = vizinhos.some((valor) => Math.abs(valor - atual) < 4);
    if (!pertoDeUmVizinho) {
      return 'top';
    }
    return indice % 2 === 0 ? 'top' : 'bottom';
  }

  /**
   * Faixa vertical suave sob a coluna apontada pelo cursor e sob a coluna
   * selecionada no cross-filter. Dá alvo visual à interação sem desenhar
   * moldura em volta da marca — e é o que substitui o contorno preto que
   * antes marcava a seleção.
   */
  private pluginMarcadorDeColuna(): Plugin<'bar'> {
    return {
      id: 'marcadorDeColuna',
      // beforeDatasetsDraw: a faixa entra ATRÁS das barras, nunca por cima.
      beforeDatasetsDraw: (chart) => {
        const { ctx, chartArea } = chart;
        if (!chartArea) { return; }

        const indiceSelecionado = this.serie.findIndex((p) => p.periodo === this.periodoSelecionado);
        const indiceAtivo = chart.tooltip?.getActiveElements?.()[0]?.index ?? -1;
        if (indiceSelecionado < 0 && indiceAtivo < 0) { return; }

        const metaBase = chart.getDatasetMeta(0);
        const largura = (chartArea.right - chartArea.left) / Math.max(this.serie.length, 1);

        const pintar = (indice: number, alfa: number) => {
          const elemento = metaBase.data[indice] as unknown as GeometriaBarra | undefined;
          if (!elemento) { return; }
          ctx.save();
          ctx.fillStyle = this.paleta.comOpacidade(this.paleta.acao, alfa);
          ctx.fillRect(
            elemento.x - largura / 2,
            chartArea.top,
            largura,
            chartArea.bottom - chartArea.top,
          );
          ctx.restore();
        };

        if (indiceAtivo >= 0 && indiceAtivo !== indiceSelecionado) { pintar(indiceAtivo, 0.05); }
        if (indiceSelecionado >= 0) { pintar(indiceSelecionado, 0.09); }
      },
    };
  }

  /**
   * Total (aprovadas + reprovadas) impresso logo acima de cada coluna — mantém
   * os segmentos individuais dentro da barra e acrescenta a soma sem precisar
   * de mais um dataset. Segue a mesma dimerização do cross-filter.
   *
   * O total acompanha a altura da própria coluna (não uma régua fixa): a linha
   * de % corre numa faixa reservada acima das barras, então não há mais o
   * risco de o total esbarrar no chip de percentual.
   */
  private pluginTotalPorColuna(): Plugin<'bar'> {
    return {
      id: 'totalPorColuna',
      afterDatasetsDraw: (chart) => {
        const { ctx, chartArea } = chart;
        if (!chartArea) { return; }
        // "Reprovadas" é o 2º dataset e fecha a pilha: seu `y` é o topo real da
        // coluna mesmo quando o valor é zero (aí ele colapsa no topo das
        // aprovadas).
        const metaTopo = chart.getDatasetMeta(1);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = '700 11px Roboto, sans-serif';
        ctx.fillStyle = this.paleta.token('--cf-texto', '#212121');

        this.serie.forEach((ponto, indice) => {
          const total = ponto.aprovadas + ponto.reprovadas;
          if (!total) { return; }

          const elemento = metaTopo.data[indice] as unknown as GeometriaBarra | undefined;
          if (!elemento) { return; }

          ctx.globalAlpha = this.estaOpaco(ponto.periodo) ? 1 : 0.4;
          ctx.fillText(`${total}`, elemento.x, elemento.y - 8);
        });

        ctx.restore();
      },
    };
  }

  private montarOpcoes(): ChartConfiguration<'bar'>['options'] {
    const eixoTexto = this.paleta.eixoTexto;
    const grade = this.paleta.grade;

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 420, easing: 'easeOutQuart' },
      // `mode: 'index'` + `axis: 'x'`: o alvo é a COLUNA inteira, não a marca
      // pintada — o cursor não precisa acertar a barra nem o ponto da linha.
      interaction: { mode: 'index', axis: 'x', intersect: false },
      // Espaço no topo para o chip da linha e o total da coluna não serem
      // cortados pela borda do card — o pior caso é quando os dois colidem e
      // o total precisa subir mais para desviar do chip.
      layout: { padding: { top: 38, left: 4, right: 4 } },
      onHover: (evento, elementos) => {
        const alvo = evento.native?.target;
        if (alvo instanceof HTMLElement) {
          alvo.style.cursor = elementos.length ? 'pointer' : 'default';
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: eixoTexto,
            // Na visão diária são ~30 rótulos: deixa o Chart.js pular os que
            // não couberem em vez de sobrepor texto.
            autoSkip: true,
            autoSkipPadding: 8,
            maxRotation: 0,
            padding: 6,
          },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          // Headroom: confina as colunas à metade inferior do plot. A faixa de
          // cima fica reservada para a linha de %, que assim corre ACIMA das
          // barras em vez de atravessá-las — é o que substitui, num canvas só,
          // a separação que dois painéis empilhados dariam.
          grace: '82%',
          // Sem números de eixo, mas COM grade: a hairline devolve a
          // referência de magnitude que o rótulo sozinho não dá.
          border: { display: false },
          ticks: { display: false, maxTicksLimit: 4 },
          grid: { color: grade, drawTicks: false, lineWidth: 1 },
        },
        percentual: {
          display: false,
          // Patamar fixo (25/50/75/100) em vez de escala relativa ao pico:
          // mantém a mesma taxa na mesma altura quando o filtro muda.
          //
          // O `min` negativo não é um valor plotável: ele empurra a curva para
          // a METADE SUPERIOR do plot, que é o que impede a linha (e os chips
          // de %) de atravessarem as colunas. A magnitude da taxa continua
          // vindo do rótulo em cada ponto; a linha carrega a FORMA da
          // tendência, e a comparação entre períodos fica válida porque todos
          // compartilham o mesmo teto.
          // `min` negativo não é valor plotável: é o que desloca a curva para
          // a faixa superior. Calibrado para que 0% caia ACIMA do topo da
          // coluna mais alta (daí o par com o `grace` do eixo de volume), e o
          // `max` deixa folga para o chip do pico não subir dentro da régua de
          // totais.
          min: -this.tetoPercentual * 1.73,
          max: this.tetoPercentual * 1.25,
        },
      },
      plugins: {
        legend: {
          position: 'bottom',
          align: 'center',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            color: eixoTexto,
            padding: 16,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: this.paleta.tooltipFundo,
          padding: 12,
          cornerRadius: 8,
          usePointStyle: true,
          boxPadding: 6,
          titleFont: { size: 12, weight: 600 },
          bodyFont: { size: 12 },
          bodySpacing: 6,
          callbacks: {
            // Total no cabeçalho: é a leitura que o usuário busca primeiro, e
            // evita ter que somar os dois segmentos de cabeça.
            title: (itens) => {
              const ponto = this.serie[itens[0]?.dataIndex ?? -1];
              if (!ponto) { return ''; }
              const total = ponto.aprovadas + ponto.reprovadas;
              return `${ponto.rotulo} · ${total.toLocaleString('pt-BR')} peças`;
            },
            label: (contexto) => {
              const valor = contexto.parsed.y ?? 0;
              return contexto.dataset.label === '% de reprovação'
                ? ` ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% de reprovação`
                : ` ${valor.toLocaleString('pt-BR')} ${contexto.dataset.label?.toLowerCase()}`;
            },
          },
        },
      },
    };
  }
}
