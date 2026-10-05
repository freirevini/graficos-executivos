import { Directive, ElementRef, Input, NgZone, OnChanges, OnDestroy } from '@angular/core';

const DURACAO_MS = 700;

/**
 * Count-up do valor de um KPI. Anima só na primeira exibição, fora da zona do
 * Angular (nenhum ciclo de change detection por frame). Com
 * `prefers-reduced-motion: reduce` o valor final aparece direto.
 */
@Directive({ selector: '[iniContagem]', standalone: true })
export class ContagemDirective implements OnChanges, OnDestroy {
  @Input('iniContagem') valor: number | null = null;
  @Input() casas = 0;

  private jaAnimou = false;
  private quadro: number | null = null;

  constructor(private readonly el: ElementRef<HTMLElement>, private readonly zona: NgZone) {}

  ngOnChanges(): void {
    this.cancelar();
    if (this.valor === null) {
      this.el.nativeElement.textContent = '—';
      return;
    }
    const primeira = !this.jaAnimou;
    this.jaAnimou = true;
    if (primeira && !this.reduzirMovimento()) {
      this.zona.runOutsideAngular(() => this.animar(this.valor as number));
    } else {
      this.escrever(this.valor);
    }
  }

  ngOnDestroy(): void {
    this.cancelar();
  }

  private animar(destino: number): void {
    this.escrever(0);
    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / DURACAO_MS);
      this.escrever(t < 1 ? destino * (1 - (1 - t) ** 3) : destino);
      this.quadro = t < 1 ? requestAnimationFrame(passo) : null;
    };
    this.quadro = requestAnimationFrame(passo);
  }

  private escrever(valor: number): void {
    this.el.nativeElement.textContent = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: this.casas,
      maximumFractionDigits: this.casas,
    }).format(valor);
  }

  private cancelar(): void {
    if (this.quadro !== null) {
      cancelAnimationFrame(this.quadro);
      this.quadro = null;
    }
  }

  private reduzirMovimento(): boolean {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
