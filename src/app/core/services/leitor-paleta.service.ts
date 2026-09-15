import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

/**
 * Lê os design tokens de `src/styles/_paleta.scss` em runtime.
 *
 * Chart.js exige cores concretas (string) — não aceita `var(--x)`. Este service
 * resolve as custom properties uma única vez e entrega hex prontos, de modo que
 * re-tematizar continue sendo edição de UM arquivo SCSS.
 *
 * Os valores de reserva existem para o ambiente de teste (Karma), onde o SCSS
 * global pode não estar aplicado ao `documentElement`.
 */
@Injectable({ providedIn: 'root' })
export class LeitorPaletaService {
  private readonly cache = new Map<string, string>();

  constructor(@Inject(DOCUMENT) private readonly documento: Document) {}

  token(nome: string, reserva: string): string {
    const emCache = this.cache.get(nome);
    if (emCache !== undefined) {
      return emCache;
    }
    const raiz = this.documento.documentElement;
    const valor = getComputedStyle(raiz).getPropertyValue(nome).trim() || reserva;
    this.cache.set(nome, valor);
    return valor;
  }

  /** Série categórica, na ordem definida na paleta. */
  serieCategorica(): string[] {
    const reservas = [
      '#1976d2', '#a3225c', '#2e7d32', '#4527a0',
      '#2f89c7', '#d42245', '#305393', '#8a5300',
    ];
    return reservas.map((reserva, i) => this.token(`--grf-cor-${i + 1}`, reserva));
  }

  /** Série "aprovadas" dos gráficos — azul institucional, não o verde de status. */
  get aprovada(): string { return this.token('--grf-aprovadas', '#002bab'); }
  get reprovada(): string { return this.token('--grf-reprovadas', '#c62828'); }
  /** Linha de % de reprovação no gráfico de correlação. */
  get linhaPercentual(): string { return this.token('--grf-linha-percentual', '#93aede'); }
  get acao(): string { return this.token('--cf-azul-acao', '#1976d2'); }
  get realce(): string { return this.token('--grf-realce', '#f57f17'); }
  get grade(): string { return this.token('--grf-grade', '#eceff1'); }
  get eixoTexto(): string { return this.token('--grf-eixo-texto', '#666666'); }
  get tooltipFundo(): string { return this.token('--grf-tooltip-fundo', '#212121'); }

  /** Aplica transparência a um hex de 6 dígitos (estados não selecionados). */
  comOpacidade(cor: string, alfa: number): string {
    const hex = cor.replace('#', '');
    if (hex.length !== 6) {
      return cor;
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alfa})`;
  }
}
