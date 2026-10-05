import { importProvidersFrom } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { Routes } from '@angular/router';
import { environment } from '../../../environments/environment';
import { PaginaInicioComponent } from './containers/pagina-inicio/pagina-inicio.component';
import { InicioHttpService } from './data/inicio-http.service';
import { InicioMockService } from './data/inicio-mock.service';
import { InicioService } from './data/inicio.service';

/**
 * Rotas lazy da Home.
 *
 * A TROCA MOCK <-> BFF acontece no provider abaixo e em nenhum outro lugar
 * (`environment.usarMock`), mesmo princípio de `GraficosExecutivosModule`.
 */
export const INICIO_ROUTES: Routes = [
  {
    path: '',
    component: PaginaInicioComponent,
    title: 'Início · ConforME',
    // PONTO DE INTEGRAÇÃO: no projeto real, acrescentar aqui o guard de
    // autenticação/perfil do chassi (ex.: canActivate: [AutenticacaoGuard]).
    providers: [
      // MatDialog (Material 15) só existe se o módulo for importado: a página abre diálogos.
      importProvidersFrom(MatDialogModule),
      {
        provide: InicioService,
        useClass: environment.usarMock ? InicioMockService : InicioHttpService,
      },
    ],
  },
];
