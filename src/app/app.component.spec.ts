import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AppComponent } from './app.component';

@Component({ template: '' })
class PaginaFalsaComponent {}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let raiz: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent, PaginaFalsaComponent],
      imports: [RouterTestingModule.withRoutes([
        { path: 'inicio', component: PaginaFalsaComponent },
        { path: 'graficos-executivos', component: PaginaFalsaComponent },
      ])],
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    raiz = fixture.nativeElement;
  });

  it('marca só a aba ativa com aria-current="page"', async () => {
    await TestBed.inject(Router).navigateByUrl('/inicio');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const links = Array.from(raiz.querySelectorAll<HTMLAnchorElement>('.casca__menu a'));
    expect(links.map((a) => a.getAttribute('aria-current'))).toEqual(['page', null]);
  });

  it('skip-link foca o conteúdo sem navegar', () => {
    fixture.detectChanges();
    const link = raiz.querySelector<HTMLAnchorElement>('.pular-para-conteudo')!;
    const evento = new MouseEvent('click', { cancelable: true, bubbles: true });
    link.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(raiz.querySelector('#conteudo'));
  });
});
