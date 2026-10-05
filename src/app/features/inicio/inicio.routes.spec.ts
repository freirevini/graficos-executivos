import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { InicioMockService } from './data/inicio-mock.service';
import { InicioService } from './data/inicio.service';
import { INICIO_ROUTES } from './inicio.routes';

/**
 * Os specs de componente importam `MatDialogModule` por conta própria e
 * escondem providers que faltam na rota: este spec resolve só o que a rota
 * declara, como o app real faz.
 */
describe('INICIO_ROUTES', () => {
  let injetor: EnvironmentInjector;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    const providers = INICIO_ROUTES[0].providers ?? [];
    injetor = createEnvironmentInjector(providers, TestBed.inject(EnvironmentInjector));
  });

  it('serve a Home em "" com título', () => {
    expect(INICIO_ROUTES[0].path).toBe('');
    expect(INICIO_ROUTES[0].title).toBe('Início · ConforME');
  });

  it('provê MatDialog para a página abrir os diálogos', () => {
    expect(injetor.get(MatDialog)).toBeTruthy();
  });

  it('provê InicioService (mock em desenvolvimento)', () => {
    expect(injetor.get(InicioService)).toBeInstanceOf(InicioMockService);
  });
});
