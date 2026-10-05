import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { TileKpiComponent } from './tile-kpi.component';

describe('TileKpiComponent', () => {
  let fixture: ComponentFixture<TileKpiComponent>;
  let c: TileKpiComponent;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    const nada = () => undefined;
    spyOn(window, 'matchMedia').and.returnValue({
      matches: true, addListener: nada, removeListener: nada, addEventListener: nada, removeEventListener: nada,
    } as unknown as MediaQueryList);
    TestBed.configureTestingModule({ imports: [TileKpiComponent], providers: [{ provide: LOCALE_ID, useValue: 'pt-BR' }] });
    fixture = TestBed.createComponent(TileKpiComponent);
    c = fixture.componentInstance;
  });

  function render(entrada: Partial<TileKpiComponent>): void {
    Object.entries(entrada).forEach(([chave, valor]) => fixture.componentRef.setInput(chave, valor));
    fixture.detectChanges();
  }

  it('mostra valor em pt-BR e variação com sinal e unidade', () => {
    render({ rotulo: 'Análises', valor: 1234, variacao: { valor: 8.2, unidade: '%' }, comparativo: 'ago/26 vs. jul/26' });

    expect(el().querySelector('.tile__valor')?.textContent).toContain('1.234');
    expect(el().querySelector('.tile__delta')?.textContent?.trim()).toBe('+8,2%');
    expect(c.classeVariacao).toBe('tile__variacao--boa');
  });

  it('alta é ruim inverte a cor, mas a seta segue o sentido real', () => {
    render({ valor: 33, variacao: { valor: 2, unidade: 's' }, altaEhRuim: true });

    expect(c.classeVariacao).toBe('tile__variacao--ruim');
    expect(c.icoVariacao).toBe('trending_up');
    expect(c.textoVariacao).toBe('+2 s');
  });

  it('descreve a variação por extenso para leitor de tela', () => {
    render({ valor: 70, variacao: { valor: -1.1, unidade: 'p.p.' }, comparativo: 'set/26 vs. ago/26' });

    expect(el().querySelector('.apenas-leitor-tela')?.textContent).toBe('queda de 1,1 pontos percentuais set/26 vs. ago/26');
  });

  it('sem variação não renderiza rodapé de variação', () => {
    render({ valor: 5, variacao: null });
    expect(el().querySelector('.tile__variacao')).toBeNull();
  });

  it('só vira botão com pista, emite ao clicar e fica desabilitado sem valor', () => {
    let emitiu = 0;
    c.acionado.subscribe(() => emitiu++);
    render({ rotulo: 'Tempo', valor: 33, sufixo: ' s', pista: 'Ver mês a mês' });

    const botao = el().querySelector('button.tile__botao') as HTMLButtonElement;
    expect(botao.getAttribute('aria-haspopup')).toBe('dialog');
    expect(botao.textContent).toContain('Tempo: 33 s. Ver mês a mês');
    botao.click();
    expect(emitiu).toBe(1);

    render({ valor: null });
    expect((el().querySelector('button.tile__botao') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('sem pista não há botão', () => {
    render({ valor: 5 });
    expect(el().querySelector('button')).toBeNull();
  });

  it('sparkline só com 2 ou mais pontos', () => {
    render({ valor: 1, serie: [3] });
    expect(el().querySelector('canvas')).toBeNull();

    render({ serie: [3, 5, 4] });
    expect(el().querySelector('canvas')).not.toBeNull();
    expect(c.dadosSparkline.datasets[0].data).toEqual([3, 5, 4]);
  });

  it('carregando mostra skeleton no lugar do valor', () => {
    render({ carregando: true, valor: null });
    expect(el().querySelector('cf-skeleton')).not.toBeNull();
    expect(el().querySelector('.tile__valor')).toBeNull();
  });

  it('com logo mostra a imagem decorativa no lugar do ícone', () => {
    render({ valor: 4, icone: 'hub', logo: 'assets/logos/gemini.png' });
    const img = el().querySelector('.tile__badge img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('assets/logos/gemini.png');
    expect(img.getAttribute('alt')).toBe('');
    expect(el().querySelector('.tile__badge mat-icon')).toBeNull();
  });

  it('sem logo mantém o ícone', () => {
    render({ valor: 4, icone: 'hub' });
    expect(el().querySelector('.tile__badge img')).toBeNull();
    expect(el().querySelector('.tile__badge mat-icon')).not.toBeNull();
  });
});
