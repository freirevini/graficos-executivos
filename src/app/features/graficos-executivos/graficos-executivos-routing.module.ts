import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaginaGraficosExecutivosComponent } from './containers/pagina-graficos-executivos/pagina-graficos-executivos.component';

const rotas: Routes = [
  {
    path: '',
    component: PaginaGraficosExecutivosComponent,
    title: 'Gráficos Executivos · Conforme',
    // PONTO DE INTEGRAÇÃO: no projeto real, acrescentar aqui o guard de
    // autenticação/perfil do chassi (ex.: canActivate: [AutenticacaoGuard]).
  },
];

@NgModule({
  imports: [RouterModule.forChild(rotas)],
  exports: [RouterModule],
})
export class GraficosExecutivosRoutingModule {}
