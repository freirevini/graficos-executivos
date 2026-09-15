import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { LeitorPaletaService } from '../../../../core/services/leitor-paleta.service';
import { TotalPorProdutoDto } from '../../models/graficos-executivos.dto';

/** Uma linha da lista, com a % de participação no volume total já calculada. */
export interface LinhaProduto extends TotalPorProdutoDto {
  percentualDoVolume: number;
}

/**
 * Card 3 — Reprovação por produto.
 *
 * KPI do topo replica a mesma lógica/estilo dos outros cards (Origem ×
 * resultado, Reprovação por risco): total de peças + variação vs. período
 * anterior, inline. Aqui o número é VOLUME (não reprovadas), então a cor
 * segue a mesma semântica do card "Origem × resultado" — alta é boa (verde),
 * queda é ruim (vermelho) —, e não a semântica invertida do card de risco.
 *
 * Lista de produtos com barra de progresso: nome + taxa de reprovação na
 * primeira linha, quantidade de peças (sozinha, sem "% do volume") logo
 * abaixo, alinhada à direita. Ordenação padrão: maior % de reprovação para o
 * menor — mesmo critério dos outros dois cards abaixo do gráfico principal.
 */
@Component({
  selector: 'gx-card-total-produto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-total-produto.component.html',
  styleUrls: ['./card-total-produto.component.scss'],
})
export class CardTotalProdutoComponent implements OnChanges {
  @Input() itens: TotalPorProdutoDto[] = [];
  /** Produto que está recortando a página, quando há exatamente um. */
  @Input() selecionado: string | null = null;

  /** Cross-filter: clicar numa linha recorta a página inteira. */
  @Output() produtoAlternado = new EventEmitter<string>();
  /** Total de peças no período imediatamente anterior, de igual duração. */
  @Input() totalPeriodoAnterior: number | null = null;

  linhas: LinhaProduto[] = [];
  totalGeral = 0;
  variacaoGeral: number | null = null;

  constructor(private readonly paleta: LeitorPaletaService) {}

  ngOnChanges(): void {
    // Padrão da página: maior % de reprovação para o menor.
    const ordenados = [...this.itens].sort((a, b) => b.percentualReprovacao - a.percentualReprovacao);
    this.totalGeral = ordenados.reduce((soma, item) => soma + item.total, 0);
    this.variacaoGeral = this.variacao(this.totalGeral, this.totalPeriodoAnterior);

    this.linhas = ordenados.map((item) => ({
      ...item,
      percentualDoVolume: this.totalGeral ? Math.round((item.total / this.totalGeral) * 1000) / 10 : 0,
    }));
  }

  get corBarra(): string {
    return this.paleta.acao;
  }

  get descricaoAcessivel(): string {
    if (!this.linhas.length) {
      return 'Sem dados.';
    }
    const lider = this.linhas[0];
    return `Volume total de ${this.totalGeral} peças, distribuído entre ${this.linhas.length} produtos. `
      + `Líder: ${lider?.rotulo}, com ${lider?.total} peças e ${lider?.percentualReprovacao.toFixed(1)} por cento de reprovação.`;
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
}
