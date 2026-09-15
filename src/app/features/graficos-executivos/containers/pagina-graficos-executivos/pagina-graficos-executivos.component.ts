import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, combineLatest, map, takeUntil } from 'rxjs';
import { ErroCarregamento } from '../../../../core/models/erro-carregamento.model';
import {
  FiltrosGraficos,
  deQueryParams,
  filtrosIguais,
  paraQueryParams,
} from '../../models/filtros.model';
import { PeriodoEscolhido } from '../../components/seletor-periodo/seletor-periodo.component';
import {
  DashboardGraficosDto,
  LinhaAnaliticoDto,
  OpcoesFiltroDto,
  PaginaDto,
  ParametrosPagina,
} from '../../models/graficos-executivos.dto';
import { DimensaoFiltravel, GraficosExecutivosStore, Recurso } from '../../state/graficos-executivos.store';

interface VisaoPagina {
  filtros: FiltrosGraficos;
  opcoes: Recurso<OpcoesFiltroDto>;
  dashboard: Recurso<DashboardGraficosDto>;
  analitico: Recurso<PaginaDto<LinhaAnaliticoDto>>;
  parametros: ParametrosPagina;
  /** true quando o recorte atual não produziu nenhuma peça. */
  semDados: boolean;
}

/**
 * Container (smart) da página de Gráficos Executivos.
 *
 * Responsabilidades — e só estas:
 *  1. injetar o store e expor um único view-model ao template;
 *  2. traduzir eventos dos componentes de apresentação em comandos do store;
 *  3. manter o recorte espelhado na URL, para deep-link e F5 preservarem o
 *     estado (inclusive o mês selecionado por clique no gráfico).
 *
 * Nenhuma regra de agregação vive aqui: isso é do BFF (ou do mock, em dev).
 */
@Component({
  selector: 'gx-pagina-graficos-executivos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pagina-graficos-executivos.component.html',
  styleUrls: ['./pagina-graficos-executivos.component.scss'],
  providers: [GraficosExecutivosStore],
})
export class PaginaGraficosExecutivosComponent implements OnInit, OnDestroy {
  readonly visao$: Observable<VisaoPagina>;

  private readonly destruir$ = new Subject<void>();

  constructor(
    private readonly store: GraficosExecutivosStore,
    private readonly rota: ActivatedRoute,
    private readonly roteador: Router,
  ) {
    this.visao$ = combineLatest({
      filtros: this.store.filtros$,
      opcoes: this.store.opcoesFiltro$,
      dashboard: this.store.dashboard$,
      analitico: this.store.analitico$,
      parametros: this.store.parametrosPagina$,
    }).pipe(
      map((parcial) => ({
        ...parcial,
        semDados: !parcial.dashboard.carregando
          && !parcial.dashboard.erro
          && (parcial.dashboard.dados?.kpis.totalPecas ?? 0) === 0,
      })),
    );
  }

  ngOnInit(): void {
    // URL -> store (carga inicial, deep-link e navegação com voltar/avançar).
    this.rota.queryParams.pipe(takeUntil(this.destruir$)).subscribe((params) => {
      this.store.definirFiltros(deQueryParams(params));
    });

    // store -> URL. `replaceUrl` evita empilhar uma entrada de histórico a cada
    // clique de filtro; o guard de igualdade evita navegação redundante.
    this.store.filtros$.pipe(takeUntil(this.destruir$)).subscribe((filtros) => {
      const naUrl = deQueryParams(this.rota.snapshot.queryParams);
      if (filtrosIguais(naUrl, filtros)) {
        return;
      }
      void this.roteador.navigate([], {
        relativeTo: this.rota,
        queryParams: paraQueryParams(filtros),
        replaceUrl: true,
      });
    });
  }

  ngOnDestroy(): void {
    this.destruir$.next();
    this.destruir$.complete();
  }

  aplicarFiltros(parcial: Partial<FiltrosGraficos>): void {
    this.store.aplicarFiltros(parcial);
  }

  limparFiltros(): void {
    this.store.limparFiltros();
  }

  alternarPeriodo(periodo: string): void {
    this.store.alternarPeriodo(periodo);
  }

  escolherPeriodo({ de, ate, granularidade }: PeriodoEscolhido): void {
    this.store.aplicarPeriodo(de, ate, granularidade);
  }

  alternarDimensao(dimensao: DimensaoFiltravel, chave: string): void {
    this.store.alternarDimensao(dimensao, chave);
  }

  /**
   * Chave em recorte numa dimensão, ou `null` quando não há exatamente uma.
   * Com duas ou mais selecionadas (via barra de filtros) nenhum card destaca
   * item algum — destacar só a primeira mentiria sobre o recorte aplicado.
   */
  recorteUnico(selecionadas: string[]): string | null {
    return selecionadas.length === 1 ? selecionadas[0] ?? null : null;
  }

  mudarPagina(parcial: Partial<ParametrosPagina>): void {
    this.store.mudarPagina(parcial);
  }

  recarregar(): void {
    this.store.recarregar();
  }

  /** Une o erro do dashboard ao do relatório para o banner do topo. */
  erroGlobal(visao: VisaoPagina): ErroCarregamento | null {
    return visao.opcoes.erro;
  }
}
