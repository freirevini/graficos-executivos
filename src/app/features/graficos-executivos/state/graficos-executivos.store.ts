import { Injectable, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  MonoTypeOperatorFunction,
  Observable,
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  scan,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
} from 'rxjs';
import { GraficosExecutivosService } from '../data/graficos-executivos.service';
import { ErroCarregamento, mapearErro } from '../../../core/models/erro-carregamento.model';
import { FiltrosGraficos, Granularidade, filtrosIguais, filtrosPadrao } from '../models/filtros.model';

/** Dimensões que os cards de composição conseguem recortar. */
export type DimensaoFiltravel = 'produtos' | 'origens' | 'riscos';
import {
  DashboardGraficosDto,
  LinhaAnaliticoDto,
  OpcoesFiltroDto,
  PaginaDto,
  ParametrosPagina,
} from '../models/graficos-executivos.dto';

/** Envelope de carregamento usado por todos os blocos da tela. */
export interface Recurso<T> {
  /** Primeira carga: ainda não há nada para desenhar, a UI mostra skeleton. */
  carregando: boolean;
  /** Recarga: já existe dado anterior na tela, que permanece visível e esmaecido. */
  atualizando: boolean;
  dados: T | null;
  erro: ErroCarregamento | null;
}

function carregando<T>(): Recurso<T> {
  return { carregando: true, atualizando: false, dados: null, erro: null };
}
function pronto<T>(dados: T): Recurso<T> {
  return { carregando: false, atualizando: false, dados, erro: null };
}
function falhou<T>(erro: ErroCarregamento): Recurso<T> {
  return { carregando: false, atualizando: false, dados: null, erro };
}

/**
 * Stale-while-revalidate.
 *
 * Sem isto, cada troca de filtro (e cada clique de mês no gráfico) devolvia
 * `dados: null` e a página inteira virava skeleton — o layout encolhia e a
 * posição de rolagem saltava. Aqui a recarga preserva o último dado bom na
 * tela e apenas marca `atualizando`, então a altura da página não muda.
 *
 * Erro continua limpando os dados de propósito: melhor um estado de erro
 * explícito do que um número velho passando por atual.
 */
function manterDadoAnterior<T>(): MonoTypeOperatorFunction<Recurso<T>> {
  return scan((anterior: Recurso<T>, atual: Recurso<T>) => {
    if (!atual.carregando) {
      return atual;
    }
    return anterior.dados
      ? { carregando: false, atualizando: true, dados: anterior.dados, erro: null }
      : carregando<T>();
  }, carregando<T>());
}

export const PAGINA_PADRAO: ParametrosPagina = {
  pagina: 0,
  tamanho: 10,
  ordenarPor: 'dataAvaliacao',
  direcao: 'desc',
};

/**
 * Estado da página, em services + RxJS (o projeto não usa NgRx).
 *
 * Fluxo único de dados:
 *
 *   barra de filtros     ─┐
 *   seletor de período   ─┼─> filtros$ ─┬─> dashboard$ (KPIs, série, 3 cards)
 *   clique num ponto     ─┤             └─> analitico$ (tabela)
 *   query params da URL  ─┘
 *
 * Qualquer alteração de filtro — inclusive o clique num ponto do gráfico de
 * correlação — passa por `filtros$`, então TODOS os blocos reagem juntos.
 *
 * Fornecido no nível do componente de página (não em root): o estado morre
 * junto com a rota lazy.
 */
@Injectable()
export class GraficosExecutivosStore implements OnDestroy {
  private readonly destruir$ = new Subject<void>();

  private readonly filtrosSubject = new BehaviorSubject<FiltrosGraficos>(filtrosPadrao());
  private readonly paginaSubject = new BehaviorSubject<ParametrosPagina>(PAGINA_PADRAO);
  private readonly recarregarSubject = new BehaviorSubject<void>(undefined);

  /** Recorte atual. Fonte de verdade da tela. */
  readonly filtros$: Observable<FiltrosGraficos> = this.filtrosSubject.pipe(
    distinctUntilChanged(filtrosIguais),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly parametrosPagina$: Observable<ParametrosPagina> = this.paginaSubject.asObservable();

  /** Opções dos selects. Carregado uma vez por instância da página. */
  readonly opcoesFiltro$: Observable<Recurso<OpcoesFiltroDto>> = this.recarregarSubject.pipe(
    switchMap(() =>
      this.serviço.carregarOpcoesFiltro().pipe(
        map((opcoes) => pronto(opcoes)),
        catchError((erro) => of(falhou<OpcoesFiltroDto>(mapearErro(erro)))),
        startWith(carregando<OpcoesFiltroDto>()),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly dashboard$: Observable<Recurso<DashboardGraficosDto>> = combineLatest([
    this.filtros$,
    this.recarregarSubject,
  ]).pipe(
    switchMap(([filtros]) =>
      this.serviço.carregarDashboard(filtros).pipe(
        map((dados) => pronto(dados)),
        catchError((erro) => of(falhou<DashboardGraficosDto>(mapearErro(erro)))),
        startWith(carregando<DashboardGraficosDto>()),
      ),
    ),
    manterDadoAnterior<DashboardGraficosDto>(),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  readonly analitico$: Observable<Recurso<PaginaDto<LinhaAnaliticoDto>>> = combineLatest([
    this.filtros$,
    this.paginaSubject,
    this.recarregarSubject,
  ]).pipe(
    switchMap(([filtros, pagina]) =>
      this.serviço.carregarAnalitico(filtros, pagina).pipe(
        map((dados) => pronto(dados)),
        catchError((erro) => of(falhou<PaginaDto<LinhaAnaliticoDto>>(mapearErro(erro)))),
        startWith(carregando<PaginaDto<LinhaAnaliticoDto>>()),
      ),
    ),
    manterDadoAnterior<PaginaDto<LinhaAnaliticoDto>>(),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  constructor(private readonly serviço: GraficosExecutivosService) {
    // Trocar o recorte reinicia a paginação — senão o usuário fica numa página
    // que deixou de existir.
    this.filtros$
      .pipe(takeUntil(this.destruir$))
      .subscribe(() => this.paginaSubject.next({ ...this.paginaSubject.value, pagina: 0 }));
  }

  get filtrosAtuais(): FiltrosGraficos {
    return this.filtrosSubject.value;
  }

  /** Aplica o recorte vindo da barra de filtros (preserva o mês selecionado). */
  aplicarFiltros(parcial: Partial<FiltrosGraficos>): void {
    this.filtrosSubject.next({ ...this.filtrosSubject.value, ...parcial });
  }

  /** Substitui o estado inteiro — usado ao reidratar a partir da URL. */
  definirFiltros(filtros: FiltrosGraficos): void {
    if (!filtrosIguais(this.filtrosSubject.value, filtros)) {
      this.filtrosSubject.next(filtros);
    }
  }

  /**
   * Cross-filter do gráfico de correlação. Clicar no ponto já selecionado
   * desfaz a seleção, que é como o usuário "volta" para o período completo.
   */
  alternarPeriodo(periodo: string | null): void {
    const atual = this.filtrosSubject.value.periodo;
    this.aplicarFiltros({ periodo: atual === periodo ? null : periodo });
  }

  /**
   * Cross-filter dos cards de composição (risco, origem, produto). Clicar num
   * item recorta a página inteira por ele; clicar no mesmo item de novo desfaz.
   *
   * O clique SUBSTITUI a seleção daquela dimensão em vez de somar a ela: o
   * card mostra um item por vez em destaque, então somar deixaria o destaque
   * mentindo sobre o recorte aplicado. Quem quer combinar vários continua
   * usando o multi-select da barra de filtros.
   */
  alternarDimensao(dimensao: DimensaoFiltravel, chave: string): void {
    const atual = this.filtrosSubject.value[dimensao];
    const jaERecorteUnico = atual.length === 1 && atual[0] === chave;
    this.aplicarFiltros({ [dimensao]: jaERecorteUnico ? [] : [chave] });
  }

  /**
   * Troca a janela do seletor segmentado. Sempre descarta o recorte de ponto:
   * a chave selecionada pode não existir na nova janela nem na nova
   * granularidade.
   */
  aplicarPeriodo(de: string, ate: string, granularidade: Granularidade): void {
    this.aplicarFiltros({ de, ate, granularidade, periodo: null });
  }

  /**
   * Volta a página ao estado inicial: dimensões, recorte de ponto E janela de
   * tempo. O botão que dispara isso aparece sempre que existe QUALQUER desvio
   * do padrão — inclusive um período trocado no calendário —, então limpar
   * pela metade deixaria o rótulo prometendo o que não cumpre.
   */
  limparFiltros(): void {
    this.filtrosSubject.next(filtrosPadrao());
  }

  mudarPagina(parcial: Partial<ParametrosPagina>): void {
    this.paginaSubject.next({ ...this.paginaSubject.value, ...parcial });
  }

  /** Re-dispara todas as chamadas — botão "Tentar novamente" dos estados de erro. */
  recarregar(): void {
    this.recarregarSubject.next();
  }

  ngOnDestroy(): void {
    this.destruir$.next();
    this.destruir$.complete();
  }
}
