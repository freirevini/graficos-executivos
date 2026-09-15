import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { MarkdownService } from '../../../../core/services/markdown.service';
import {
  CampoOrdenacaoAnalitico,
  LinhaAnaliticoDto,
  PaginaDto,
  ParametrosPagina,
} from '../../models/graficos-executivos.dto';
import { DialogoParecerComponent, DadosDialogoParecer } from '../dialogo-parecer/dialogo-parecer.component';

/**
 * Relatório analítico (dumb) — rodapé da página.
 *
 * Colunas: Produto · Data Avaliação · Resultado · Risco Atrelado · Parecer IA ·
 * Recomendações para ajustes.
 *
 * Paginação e ordenação são SERVER-SIDE: o componente não recebe a coleção
 * inteira, só a página atual, e emite a intenção de mudança. Isso é o que
 * permite o relatório escalar para dezenas de milhares de peças.
 *
 * Parecer e recomendações chegam em Markdown gerado por LLM. Na célula são
 * exibidos como texto plano truncado (sem HTML), e a versão completa só é
 * renderizada no diálogo, sempre passando por MarkdownService (markdown-it +
 * DOMPurify).
 */
@Component({
  selector: 'gx-relatorio-analitico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './relatorio-analitico.component.html',
  styleUrls: ['./relatorio-analitico.component.scss'],
})
export class RelatorioAnaliticoComponent {
  @Input() pagina: PaginaDto<LinhaAnaliticoDto> | null = null;
  @Input() parametros: ParametrosPagina | null = null;

  @Output() parametrosAlterados = new EventEmitter<Partial<ParametrosPagina>>();

  readonly colunas = [
    'produto',
    'dataAvaliacao',
    'resultado',
    'riscoAtrelado',
    'parecerIa',
    'recomendacoesAjuste',
  ];

  readonly tamanhosPagina = [10, 25, 50];

  constructor(
    private readonly markdown: MarkdownService,
    private readonly dialogo: MatDialog,
  ) {}

  resumo(texto: string, limite = 110): string {
    return this.markdown.paraTextoPlano(texto, limite) || '—';
  }

  aoOrdenar(ordenacao: Sort): void {
    if (!ordenacao.direction) {
      return;
    }
    this.parametrosAlterados.emit({
      ordenarPor: ordenacao.active as CampoOrdenacaoAnalitico,
      direcao: ordenacao.direction,
      pagina: 0,
    });
  }

  aoPaginar(evento: PageEvent): void {
    this.parametrosAlterados.emit({ pagina: evento.pageIndex, tamanho: evento.pageSize });
  }

  abrirDetalhe(linha: LinhaAnaliticoDto): void {
    this.dialogo.open<DialogoParecerComponent, DadosDialogoParecer>(DialogoParecerComponent, {
      data: { linha },
      width: 'min(720px, 92vw)',
      maxHeight: '86vh',
      autoFocus: 'dialog',
      restoreFocus: true,
      ariaLabel: `Parecer completo da peça ${linha.id}`,
    });
  }
}
