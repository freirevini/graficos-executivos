import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ErroCarregamento } from '../../../core/models/erro-carregamento.model';

/**
 * STUB DO CHASSI — substituível por `<bv-card>` do @arqt/ng15-ui.
 *
 * Centraliza os quatro estados de um bloco de dashboard (carregando, erro,
 * vazio, pronto) para que nenhum componente de gráfico precise repetir
 * `*ngIf` de estado. Os gráficos só são instanciados no estado "pronto", o que
 * evita Chart.js montar sobre um canvas de altura zero.
 *
 * Projeção de conteúdo:
 *   [acoes]  -> canto superior direito (botões, chips)
 *   default  -> corpo do card
 */
@Component({
  selector: 'cf-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cf-card.component.html',
  styleUrls: ['./cf-card.component.scss'],
})
export class CfCardComponent {
  @Input() titulo = '';
  @Input() descricao = '';
  @Input() carregando = false;
  /**
   * Recarga com dado anterior ainda na tela. O conteúdo permanece montado e
   * apenas esmaece — assim a altura do card não muda e a página não salta a
   * cada troca de filtro.
   */
  @Input() atualizando = false;
  @Input() erro: ErroCarregamento | null = null;
  @Input() vazio = false;
  @Input() mensagemVazio = 'Nenhum dado para o recorte selecionado.';
  /** Altura reservada para o corpo. Evita "pulo" de layout ao sair do skeleton. */
  @Input() alturaCorpo = '280px';
  /** Nível do heading, para manter a hierarquia correta na página. */
  @Input() nivelTitulo: 2 | 3 = 3;
  /**
   * Título em caixa alta e centralizado no card — usado nos 4 cards de
   * gráfico da página, não no relatório analítico (que é tabela).
   */
  @Input() centralizarTitulo = false;

  @Output() tentarNovamente = new EventEmitter<void>();
}
