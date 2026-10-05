import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModeloIaDto } from '../../models/inicio.dto';
import { ComoFuncionaComponent } from './como-funciona.component';

describe('ComoFuncionaComponent', () => {
  let fixture: ComponentFixture<ComoFuncionaComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ComoFuncionaComponent], providers: [{ provide: LOCALE_ID, useValue: 'pt-BR' }] });
    fixture = TestBed.createComponent(ComoFuncionaComponent);
  });

  it('lista as 3 etapas (envio, análise e parecer) em ordem, numa <ol>', () => {
    fixture.detectChanges();
    const titulos = Array.from(el().querySelectorAll('ol > li h3')).map((h) => h.textContent?.trim());
    expect(titulos).toEqual(['Envio da peça', 'Análise de conformidade', 'Parecer']);
  });

  it('o parecer menciona resultado, riscos e sugestões de ajuste', () => {
    fixture.detectChanges();
    const texto = el().querySelectorAll('ol > li')[2].textContent ?? '';
    expect(texto).toContain('aprovado ou reprovado');
    expect(texto).toContain('riscos');
    expect(texto).toContain('sugestões de ajuste');
  });

  it('expõe âncora #como-funciona, h2 focável e chips das normas como texto', () => {
    fixture.detectChanges();
    expect(el().querySelector('section#como-funciona')).not.toBeNull();
    expect(el().querySelector('h2#como-funciona-titulo')?.getAttribute('tabindex')).toBe('-1');
    const chips = Array.from(el().querySelectorAll('.como__chips:not(.como__chips--modelos) li')).map((l) => l.textContent?.trim());
    expect(chips).toEqual(['CMN', 'SUSEP', 'FEBRABAN', 'Políticas internas']);
  });

  it('mostra os modelos em operação com participação em pt-BR, ou oculta o grupo sem modelos', () => {
    fixture.detectChanges();
    expect(el().querySelector('.como__chips--modelos')).toBeNull();

    const modelos: ModeloIaDto[] = [{ chave: 'A', rotulo: 'Claude Sonnet', papel: 'x', participacaoPercentual: 45.6 }];
    fixture.componentRef.setInput('modelos', modelos);
    fixture.detectChanges();
    expect(el().querySelector('.como__chips--modelos li')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Claude Sonnet 45,6%');
  });

  it('texto institucional fica num <details> recolhido por padrão', () => {
    fixture.detectChanges();
    const detalhes = el().querySelector('details#sobre-conforme') as HTMLDetailsElement;
    expect(detalhes.open).toBeFalse();
    expect(detalhes.querySelector('summary')?.textContent).toContain('Saiba mais');
  });
});
