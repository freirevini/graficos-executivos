import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContagemDirective } from './contagem.directive';

@Component({
  template: '<span id="v" [iniContagem]="valor" [casas]="casas"></span>',
  standalone: true,
  imports: [ContagemDirective],
})
class HospedeComponent {
  valor: number | null = 1234;
  casas = 0;
}

function simularMovimentoReduzido(reduzido: boolean): void {
  spyOn(window, 'matchMedia').and.returnValue({ matches: reduzido } as MediaQueryList);
}

describe('ContagemDirective', () => {
  let fixture: ComponentFixture<HospedeComponent>;
  const texto = () => (fixture.nativeElement.querySelector('#v') as HTMLElement).textContent;

  beforeEach(() => {
    fixture = TestBed.createComponent(HospedeComponent);
  });

  it('com movimento reduzido mostra o valor final já no primeiro frame, em pt-BR', () => {
    simularMovimentoReduzido(true);
    fixture.detectChanges();
    expect(texto()).toBe('1.234');
  });

  it('respeita as casas decimais', () => {
    simularMovimentoReduzido(true);
    fixture.componentInstance.valor = 70.7;
    fixture.componentInstance.casas = 1;
    fixture.detectChanges();
    expect(texto()).toBe('70,7');
  });

  it('valor nulo mostra travessão', () => {
    simularMovimentoReduzido(true);
    fixture.componentInstance.valor = null;
    fixture.detectChanges();
    expect(texto()).toBe('—');
  });

  it('anima só na primeira exibição: mudança posterior escreve direto', () => {
    simularMovimentoReduzido(false);
    const raf = spyOn(window, 'requestAnimationFrame').and.returnValue(1);
    fixture.detectChanges();
    expect(raf).toHaveBeenCalledTimes(1);

    fixture.componentInstance.valor = 99;
    fixture.detectChanges();
    expect(raf).toHaveBeenCalledTimes(1);
    expect(texto()).toBe('99');
  });
});
