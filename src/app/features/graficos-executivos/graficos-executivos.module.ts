import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, MatPaginatorIntl } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgChartsModule } from 'ng2-charts';
import { environment } from '../../../environments/environment';
import { paginadorPtBr } from '../../core/paginador-pt-br';
import { ChassiModule } from '../../shared/chassi/chassi.module';
import { BarraFiltrosComponent } from './components/barra-filtros/barra-filtros.component';
import { CardOrigemResultadoComponent } from './components/card-origem-resultado/card-origem-resultado.component';
import { CardReprovacaoRiscoComponent } from './components/card-reprovacao-risco/card-reprovacao-risco.component';
import { CardTotalProdutoComponent } from './components/card-total-produto/card-total-produto.component';
import { DialogoParecerComponent } from './components/dialogo-parecer/dialogo-parecer.component';
import { FaixaKpisComponent } from './components/faixa-kpis/faixa-kpis.component';
import { GraficoCorrelacaoComponent } from './components/grafico-correlacao/grafico-correlacao.component';
import { RelatorioAnaliticoComponent } from './components/relatorio-analitico/relatorio-analitico.component';
import { CabecalhoCalendarioComponent } from './components/cabecalho-calendario/cabecalho-calendario.component';
import { SeletorPeriodoComponent } from './components/seletor-periodo/seletor-periodo.component';
import { PaginaGraficosExecutivosComponent } from './containers/pagina-graficos-executivos/pagina-graficos-executivos.component';
import { GraficosExecutivosHttpService } from './data/graficos-executivos-http.service';
import { GraficosExecutivosMockService } from './data/graficos-executivos-mock.service';
import { GraficosExecutivosService } from './data/graficos-executivos.service';
import { GraficosExecutivosRoutingModule } from './graficos-executivos-routing.module';

/**
 * Feature lazy-loaded "Gráficos Executivos".
 *
 * A TROCA MOCK <-> BFF acontece no provider abaixo e em nenhum outro lugar:
 * todo componente injeta a classe abstrata `GraficosExecutivosService`.
 * Para apontar ao BFF real, basta `environment.usarMock = false`.
 */
@NgModule({
  declarations: [
    PaginaGraficosExecutivosComponent,
    BarraFiltrosComponent,
    FaixaKpisComponent,
    GraficoCorrelacaoComponent,
    CardReprovacaoRiscoComponent,
    CardOrigemResultadoComponent,
    CardTotalProdutoComponent,
    RelatorioAnaliticoComponent,
    SeletorPeriodoComponent,
    CabecalhoCalendarioComponent,
    DialogoParecerComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GraficosExecutivosRoutingModule,
    ChassiModule,
    NgChartsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
  ],
  providers: [
    {
      provide: GraficosExecutivosService,
      useClass: environment.usarMock ? GraficosExecutivosMockService : GraficosExecutivosHttpService,
    },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: MatPaginatorIntl, useFactory: paginadorPtBr },
  ],
})
export class GraficosExecutivosModule {}
