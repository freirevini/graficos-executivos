import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Placeholder pulsante exibido enquanto o bloco carrega. */
@Component({
  selector: 'cf-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cf-skeleton" [style.height]="altura" [style.width]="largura" aria-hidden="true"></div>
  `,
  styles: [`
    .cf-skeleton {
      border-radius: var(--cf-raio-pequeno);
      background: linear-gradient(90deg, var(--cf-borda-suave) 25%, var(--cf-fundo) 37%, var(--cf-borda-suave) 63%);
      background-size: 400% 100%;
      animation: cf-brilho 1.4s ease infinite;
    }
    @keyframes cf-brilho {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }
  `],
})
export class CfSkeletonComponent {
  @Input() altura = '16px';
  @Input() largura = '100%';
}
