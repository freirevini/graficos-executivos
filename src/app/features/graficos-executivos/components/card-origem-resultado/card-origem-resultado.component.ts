import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { LeitorPaletaService } from '../../../../core/services/leitor-paleta.service';
import { OrigemPorResultadoDto } from '../../models/graficos-executivos.dto';

/** Quantos traços a barra segmentada do topo desenha, no total. */
const TRACOS_TICK_BAR = 40;

/** Uma linha da lista, com os percentuais e a tendência já calculados. */
export interface LinhaOrigem extends OrigemPorResultadoDto {
  total: number;
  percentualReprovacao: number;
  /**
   * Variação da TAXA de reprovação vs. período anterior, em pontos
   * percentuais (mesma convenção de `FaixaKpisComponent`: p.p., não % relativo
   * — de 20% para 24% é "+4 p.p.", não "+20%"). `null` quando o BFF não
   * devolveu o recorte anterior desta origem.
   */
  variacaoTaxaReprovacao: number | null;
  cor: string;
}

/** Um traço da barra segmentada do topo, já colorido pela origem que ocupa. */
export interface TracoTickBar {
  cor: string;
}

/**
 * Card 2 — Origem × resultado.
 *
 * Adaptação do "Sales by Channel" do TailAdmin:
 *  - barra segmentada em traços no topo, proporcional ao volume de cada
 *    origem (equivalente visual da tick-bar do original);
 *  - KPI agregado (total do recorte + variação vs. período anterior);
 *  - lista de canais com micro-barra de resultado, total e seta de
 *    tendência por linha.
 *
 * A seta por linha depende de `totalPeriodoAnterior` no DTO — quando o BFF não
 * devolve esse campo para uma origem, a linha fica sem seta em vez de inventar
 * uma tendência.
 */
@Component({
  selector: 'gx-card-origem-resultado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-origem-resultado.component.html',
  styleUrls: ['./card-origem-resultado.component.scss'],
})
export class CardOrigemResultadoComponent implements OnChanges {
  @Input() itens: OrigemPorResultadoDto[] = [];
  /** Origem que está recortando a página, quando há exatamente uma. */
  @Input() selecionada: string | null = null;

  /** Cross-filter: clicar numa linha recorta a página inteira. */
  @Output() origemAlternada = new EventEmitter<string>();

  linhas: LinhaOrigem[] = [];
  tracos: TracoTickBar[] = [];
  totalGeral = 0;
  variacaoGeral: number | null = null;

  constructor(private readonly paleta: LeitorPaletaService) {}

  ngOnChanges(): void {
    // Padrão da página: maior % de reprovação para o menor.
    const taxa = (item: OrigemPorResultadoDto): number => {
      const total = item.aprovadas + item.reprovadas;
      return total ? item.reprovadas / total : 0;
    };
    const ordenados = [...this.itens].sort((a, b) => taxa(b) - taxa(a));
    const cores = this.paleta.serieCategorica();

    this.totalGeral = ordenados.reduce((soma, item) => soma + item.aprovadas + item.reprovadas, 0);

    const totalAnterior = ordenados.reduce(
      (soma, item) => (item.totalPeriodoAnterior === undefined ? soma : soma + item.totalPeriodoAnterior),
      0,
    );
    const todosTemAnterior = ordenados.every((item) => item.totalPeriodoAnterior !== undefined);
    this.variacaoGeral = todosTemAnterior && totalAnterior > 0
      ? Math.round(((this.totalGeral - totalAnterior) / totalAnterior) * 1000) / 10
      : null;

    this.linhas = ordenados.map((item, i) => {
      const total = item.aprovadas + item.reprovadas;
      const percentualReprovacao = total ? Math.round((item.reprovadas / total) * 1000) / 10 : 0;
      return {
        ...item,
        total,
        percentualReprovacao,
        variacaoTaxaReprovacao: this.variacaoTaxa(percentualReprovacao, item.totalPeriodoAnterior, item.reprovadasPeriodoAnterior),
        cor: cores[i % cores.length] as string,
      };
    });

    this.tracos = this.montarTracos();
  }

  get descricaoAcessivel(): string {
    if (!this.linhas.length) {
      return 'Sem dados.';
    }
    const pior = [...this.linhas].sort((a, b) => b.percentualReprovacao - a.percentualReprovacao)[0];
    return `${this.totalGeral} peças distribuídas entre ${this.linhas.length} origens. `
      + `Pior taxa de reprovação em ${pior?.rotulo}, com ${pior?.percentualReprovacao.toFixed(1)} por cento.`;
  }

  /** Diferença em p.p. entre a taxa de reprovação atual e a do período anterior. */
  private variacaoTaxa(
    percentualAtual: number,
    totalAnterior: number | undefined,
    reprovadasAnterior: number | undefined,
  ): number | null {
    if (totalAnterior === undefined || reprovadasAnterior === undefined) {
      return null;
    }
    const percentualAnterior = totalAnterior ? Math.round((reprovadasAnterior / totalAnterior) * 1000) / 10 : 0;
    return Math.round((percentualAtual - percentualAnterior) * 10) / 10;
  }

  /**
   * Distribui `TRACOS_TICK_BAR` traços entre as origens, proporcional ao
   * volume de cada uma — sobra por maior resto para não perder traço por
   * arredondamento.
   */
  private montarTracos(): TracoTickBar[] {
    if (!this.totalGeral) {
      return [];
    }

    const brutos = this.linhas.map((linha) => (linha.total / this.totalGeral) * TRACOS_TICK_BAR);
    const bases = brutos.map(Math.floor);
    let restantes = TRACOS_TICK_BAR - bases.reduce((soma, n) => soma + n, 0);

    const ordemPorResto = brutos
      .map((valor, i) => ({ i, resto: valor - (bases[i] ?? 0) }))
      .sort((a, b) => b.resto - a.resto);

    for (const { i } of ordemPorResto) {
      if (restantes <= 0) { break; }
      bases[i] = (bases[i] ?? 0) + 1;
      restantes -= 1;
    }

    return this.linhas.flatMap((linha, i) =>
      Array.from({ length: bases[i] ?? 0 }, () => ({ cor: linha.cor })),
    );
  }
}
