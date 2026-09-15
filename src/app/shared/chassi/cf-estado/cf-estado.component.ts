import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type TipoEstado = 'vazio' | 'erro';

/**
 * Estado vazio / estado de erro. Um só componente porque a estrutura é idêntica
 * — muda o ícone, o tom e a presença do botão de nova tentativa.
 */
@Component({
  selector: 'cf-estado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cf-estado" [class.cf-estado--erro]="tipo === 'erro'" [attr.role]="tipo === 'erro' ? 'alert' : null">
      <mat-icon class="cf-estado__icone" aria-hidden="true">
        {{ tipo === 'erro' ? 'error_outline' : 'insights' }}
      </mat-icon>
      <p class="cf-estado__titulo">{{ titulo }}</p>
      <p class="cf-estado__descricao" *ngIf="descricao">{{ descricao }}</p>
      <button
        mat-stroked-button
        color="primary"
        type="button"
        *ngIf="permiteNovaTentativa"
        (click)="tentarNovamente.emit()">
        Tentar novamente
      </button>
    </div>
  `,
  styles: [`
    .cf-estado {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 160px;
      padding: 24px 16px;
      text-align: center;
      color: var(--cf-texto-secundario);
    }
    .cf-estado__icone {
      width: 40px;
      height: 40px;
      font-size: 40px;
      color: var(--cf-texto-secundario-alt);
    }
    .cf-estado--erro .cf-estado__icone { color: var(--cf-erro); }
    .cf-estado__titulo { margin: 0; font-weight: 500; color: var(--cf-texto); }
    .cf-estado__descricao { margin: 0; font-size: 0.875rem; max-width: 46ch; }
  `],
})
export class CfEstadoComponent {
  @Input() tipo: TipoEstado = 'vazio';
  @Input() titulo = 'Nada por aqui';
  @Input() descricao = '';
  @Input() permiteNovaTentativa = false;
  @Output() tentarNovamente = new EventEmitter<void>();
}
