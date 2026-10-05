import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/**
 * Hero da Home (dumb): saudação em `h1` e CTA "Avaliar peça". Única `h1` da página.
 */
@Component({
  selector: 'ini-hero',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero-inicio.component.html',
  styleUrls: ['./hero-inicio.component.scss'],
})
export class HeroInicioComponent {
  @Input() saudacao = '';
  @Input() primeiroNome = '';
  /** PONTO DE INTEGRAÇÃO: rota real do fluxo de avaliação (D2). */
  @Input() rotaAvaliar = '/avaliar';
}
