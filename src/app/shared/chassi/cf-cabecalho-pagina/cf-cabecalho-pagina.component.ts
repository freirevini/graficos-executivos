import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** STUB DO CHASSI — substituível por `<bv-page-header>` do @arqt/ng15-ui. */
@Component({
  selector: 'cf-cabecalho-pagina',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cf-cabecalho">
      <div>
        <h1 class="cf-cabecalho__titulo" *ngIf="titulo">{{ titulo }}</h1>
        <p class="cf-cabecalho__subtitulo" *ngIf="subtitulo">{{ subtitulo }}</p>
      </div>
      <div class="cf-cabecalho__lado">
        <p class="cf-cabecalho__atualizacao" *ngIf="atualizadoEm">
          Atualizado em {{ atualizadoEm | date: "dd/MM/yyyy 'às' HH:mm" : undefined : 'pt-BR' }}
        </p>
        <ng-content select="[acoes]"></ng-content>
      </div>
    </header>
  `,
  styles: [`
    .cf-cabecalho {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 4px;
    }
    .cf-cabecalho__titulo {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--cf-texto);
    }
    .cf-cabecalho__subtitulo {
      margin: 4px 0 0;
      font-size: 0.875rem;
      color: var(--cf-texto-secundario);
      max-width: 72ch;
    }
    .cf-cabecalho__lado {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cf-cabecalho__atualizacao {
      margin: 0;
      font-size: 0.75rem;
      color: var(--cf-texto-secundario-alt);
    }
  `],
})
export class CfCabecalhoPaginaComponent {
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() atualizadoEm: string | null = null;
}
