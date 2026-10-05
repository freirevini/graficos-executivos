import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HeroInicioComponent } from './hero-inicio.component';

describe('HeroInicioComponent', () => {
  let fixture: ComponentFixture<HeroInicioComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HeroInicioComponent, RouterTestingModule] });
    fixture = TestBed.createComponent(HeroInicioComponent);
    Object.assign(fixture.componentInstance, { saudacao: 'Bom dia', primeiroNome: 'Vinicius' });
    fixture.detectChanges();
  });

  it('tem exatamente um h1 com a saudação', () => {
    const h1 = el().querySelectorAll('h1');
    expect(h1.length).toBe(1);
    expect(h1[0].textContent?.trim()).toBe('Bom dia, Vinicius');
  });

  it('tem só o CTA "Avaliar peça"', () => {
    const links = Array.from(el().querySelectorAll('a')).map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(links).toEqual([['Avaliar peçaarrow_forward', '/avaliar']]);
  });

  it('não exibe perfil, data, texto de apoio nem o botão dos gráficos', () => {
    const texto = el().textContent ?? '';
    expect(el().querySelector('.hero__perfil')).toBeNull();
    expect(el().querySelector('.hero__data')).toBeNull();
    expect(texto).not.toContain('Perfil');
    expect(texto).not.toContain('Avalie peças de comunicação');
    expect(texto).not.toContain('Gráficos Executivos');
    expect(texto).not.toContain('Como funciona');
  });

  it('rota do CTA é configurável (ponto de integração D2)', () => {
    fixture.componentRef.setInput('rotaAvaliar', '/fluxo-real');
    fixture.detectChanges();
    expect(el().querySelector('a.hero__cta')?.getAttribute('href')).toBe('/fluxo-real');
  });
});
