import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgChartsModule } from 'ng2-charts';
import { CfCabecalhoPaginaComponent } from './cf-cabecalho-pagina/cf-cabecalho-pagina.component';
import { CfCardComponent } from './cf-card/cf-card.component';
import { CfEstadoComponent } from './cf-estado/cf-estado.component';
import { CfKpiComponent } from './cf-kpi/cf-kpi.component';
import { CfSkeletonComponent } from './cf-skeleton/cf-skeleton.component';

/**
 * CAMADA DE ADAPTAÇÃO DO CHASSI.
 *
 * Os pacotes @arqt/ng15-ui, @atle/ng15-biblioteca e Foundation UI vivem no
 * registry corporativo e não estão disponíveis neste ambiente isolado. Em vez
 * de espalhar markup do chassi pela feature, toda a superfície visual
 * compartilhada passa por estes cinco componentes.
 *
 * PONTO DE INTEGRAÇÃO — ao portar para o repositório real, troque a
 * IMPLEMENTAÇÃO de cada stub pelo componente correspondente do chassi e
 * mantenha o seletor e os @Input(). Nenhum componente da feature muda:
 *
 *   <cf-cabecalho-pagina>  ->  <bv-page-header>
 *   <cf-card>              ->  <bv-card>          (+ estados do próprio chassi)
 *   <cf-kpi>               ->  <bv-indicador>
 *   <cf-estado>            ->  <bv-empty-state> / <bv-error-state>
 *   <cf-skeleton>          ->  <bv-skeleton>
 */
@NgModule({
  declarations: [
    CfCabecalhoPaginaComponent,
    CfCardComponent,
    CfEstadoComponent,
    CfKpiComponent,
    CfSkeletonComponent,
  ],
  imports: [CommonModule, MatButtonModule, MatIconModule, NgChartsModule],
  exports: [
    CfCabecalhoPaginaComponent,
    CfCardComponent,
    CfEstadoComponent,
    CfKpiComponent,
    CfSkeletonComponent,
  ],
})
export class ChassiModule {}
