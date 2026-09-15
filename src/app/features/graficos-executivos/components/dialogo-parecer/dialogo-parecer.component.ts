import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SafeHtml } from '@angular/platform-browser';
import { MarkdownService } from '../../../../core/services/markdown.service';
import { LinhaAnaliticoDto } from '../../models/graficos-executivos.dto';

export interface DadosDialogoParecer {
  linha: LinhaAnaliticoDto;
}

/**
 * Detalhe de uma peça avaliada.
 *
 * Único ponto da feature que renderiza HTML. O conteúdo vem de LLM no BFF, logo
 * é tratado como não confiável: markdown-it com `html: false`, DOMPurify com
 * allowlist estreita e, por fim, o DomSanitizer do Angular — tudo dentro de
 * MarkdownService. A conversão acontece uma vez, na construção, e não a cada
 * ciclo de detecção de mudanças.
 */
@Component({
  selector: 'gx-dialogo-parecer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialogo-parecer.component.html',
  styleUrls: ['./dialogo-parecer.component.scss'],
})
export class DialogoParecerComponent {
  readonly linha: LinhaAnaliticoDto;
  readonly parecerHtml: SafeHtml;
  readonly recomendacoesHtml: SafeHtml;
  readonly temRecomendacoes: boolean;

  constructor(
    @Inject(MAT_DIALOG_DATA) dados: DadosDialogoParecer,
    markdown: MarkdownService,
  ) {
    this.linha = dados.linha;
    this.parecerHtml = markdown.paraHtmlSeguro(dados.linha.parecerIa);
    this.recomendacoesHtml = markdown.paraHtmlSeguro(dados.linha.recomendacoesAjuste);
    this.temRecomendacoes = !!dados.linha.recomendacoesAjuste?.trim();
  }
}
