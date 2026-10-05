import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

/**
 * PLACEHOLDER — rota provisória do CTA "Avaliar peça" da Home (decisão D2-b).
 *
 * PONTO DE INTEGRAÇÃO: o fluxo real de avaliação não existe neste projeto.
 * Ao integrar, troque a rota `avaliar` em `app-routing.module.ts` (ou o input
 * `rotaAvaliar` do hero) pelo destino real e apague este componente.
 */
@Component({
  selector: 'app-pagina-avaliar',
  standalone: true,
  imports: [MatButtonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="avaliar">
      <h1>Avaliar peça</h1>
      <p>O fluxo de avaliação de peças ainda não está disponível nesta versão.</p>
      <a mat-stroked-button color="primary" routerLink="/inicio">Voltar ao início</a>
    </main>
  `,
  styles: [`
    .avaliar { max-width: 560px; margin: 0 auto; padding: 48px 24px; text-align: center; }
    h1 { margin: 0 0 12px; font-size: 1.5rem; }
    p { margin: 0 0 24px; color: var(--cf-texto-secundario); }
  `],
})
export class PaginaAvaliarComponent {}
