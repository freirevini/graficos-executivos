import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/**
 * PONTO DE INTEGRAÇÃO — caminho das rotas.
 *
 * `inicio` e `graficos-executivos` são PREMISSAS. No projeto real os paths e
 * os itens de menu precisam ser confirmados com o time (ver README). Nenhuma
 * feature depende do nome: é só alterar o `path` abaixo e o link no menu do
 * chassi.
 */
const rotas: Routes = [
  {
    path: 'inicio',
    loadChildren: () =>
      import('./features/inicio/inicio.routes').then((m) => m.INICIO_ROUTES),
  },
  {
    path: 'graficos-executivos',
    loadChildren: () =>
      import('./features/graficos-executivos/graficos-executivos.module')
        .then((m) => m.GraficosExecutivosModule),
  },
  {
    path: 'avaliar',
    title: 'Avaliar peça · ConforME',
    loadComponent: () => import('./features/avaliar/pagina-avaliar.component').then((m) => m.PaginaAvaliarComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: '**', redirectTo: 'inicio' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(rotas, {
      scrollPositionRestoration: 'enabled',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
