import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Observable, of, throwError } from 'rxjs';
import { FiltrosGraficos, filtrosPadrao } from '../../models/filtros.model';
import {
  DashboardGraficosDto,
  LinhaAnaliticoDto,
  OpcoesFiltroDto,
  PaginaDto,
  ParametrosPagina,
} from '../../models/graficos-executivos.dto';
import { GraficosExecutivosService } from '../../data/graficos-executivos.service';
import { PaginaGraficosExecutivosComponent } from './pagina-graficos-executivos.component';

const OPCOES: OpcoesFiltroDto = {
  produtos: [{ chave: 'CARTAO', rotulo: 'Cartão' }],
  origens: [{ chave: 'DIGITAL', rotulo: 'Canal Digital' }],
  riscos: [{ chave: 'ALTO', rotulo: 'Alto', ordem: 3 }],
  periodoDisponivel: { de: '2026-01-01', ate: '2026-09-14' },
};

function dashboardFalso(totalPecas: number): DashboardGraficosDto {
  return {
    periodo: { de: '2026-01-01', ate: '2026-09-14' },
    kpis: {
      totalPecas,
      pecasAprovadas: totalPecas,
      pecasReprovadas: 0,
      percentualReprovacao: 0,
    },
    granularidadeSerie: 'mes',
    serieTemporal: [
      { periodo: '2026-08', rotulo: 'ago/26', aprovadas: 10, reprovadas: 2, percentualReprovacao: 16.67 },
      { periodo: '2026-09', rotulo: 'set/26', aprovadas: 8, reprovadas: 4, percentualReprovacao: 33.33 },
    ],
    reprovacaoPorRisco: [],
    origemPorResultado: [],
    totalPorProduto: [],
    atualizadoEm: '2026-09-14T12:00:00.000Z',
  };
}

const PAGINA_VAZIA: PaginaDto<LinhaAnaliticoDto> = {
  conteudo: [], pagina: 0, tamanho: 10, totalElementos: 0, totalPaginas: 1,
};

/** Dublê que registra os recortes recebidos, para verificar a propagação. */
class ServicoFalso extends GraficosExecutivosService {
  readonly filtrosDoDashboard: FiltrosGraficos[] = [];
  readonly filtrosDoAnalitico: FiltrosGraficos[] = [];
  readonly paginasPedidas: ParametrosPagina[] = [];
  totalPecas = 42;
  falharDashboard = false;

  carregarOpcoesFiltro(): Observable<OpcoesFiltroDto> {
    return of(OPCOES);
  }

  carregarDashboard(filtros: FiltrosGraficos): Observable<DashboardGraficosDto> {
    this.filtrosDoDashboard.push(filtros);
    return this.falharDashboard
      ? throwError(() => new Error('falhou'))
      : of(dashboardFalso(this.totalPecas));
  }

  carregarAnalitico(
    filtros: FiltrosGraficos,
    pagina: ParametrosPagina,
  ): Observable<PaginaDto<LinhaAnaliticoDto>> {
    this.filtrosDoAnalitico.push(filtros);
    this.paginasPedidas.push(pagina);
    return of(PAGINA_VAZIA);
  }
}

describe('PaginaGraficosExecutivosComponent', () => {
  let fixture: ComponentFixture<PaginaGraficosExecutivosComponent>;
  let componente: PaginaGraficosExecutivosComponent;
  let servico: ServicoFalso;
  let roteador: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PaginaGraficosExecutivosComponent],
      imports: [RouterTestingModule.withRoutes([])],
      providers: [{ provide: GraficosExecutivosService, useClass: ServicoFalso }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginaGraficosExecutivosComponent);
    componente = fixture.componentInstance;
    servico = TestBed.inject(GraficosExecutivosService) as unknown as ServicoFalso;
    roteador = TestBed.inject(Router);
  });

  it('carrega dashboard e analítico na inicialização', () => {
    fixture.detectChanges();

    expect(servico.filtrosDoDashboard.length).toBe(1);
    expect(servico.filtrosDoAnalitico.length).toBe(1);
  });

  it('expõe um view-model único com os quatro recursos resolvidos', (done) => {
    fixture.detectChanges();

    componente.visao$.subscribe((visao) => {
      expect(visao.opcoes.dados).toEqual(OPCOES);
      expect(visao.dashboard.dados?.kpis.totalPecas).toBe(42);
      expect(visao.analitico.dados).toEqual(PAGINA_VAZIA);
      expect(visao.dashboard.carregando).toBeFalse();
      expect(visao.semDados).toBeFalse();
      done();
    });
  });

  it('marca semDados quando o recorte não retorna nenhuma peça', (done) => {
    servico.totalPecas = 0;
    fixture.detectChanges();

    componente.visao$.subscribe((visao) => {
      expect(visao.semDados).toBeTrue();
      done();
    });
  });

  it('converte erro do dashboard em estado exibível, sem derrubar a página', (done) => {
    servico.falharDashboard = true;
    fixture.detectChanges();

    componente.visao$.subscribe((visao) => {
      expect(visao.dashboard.erro).not.toBeNull();
      expect(visao.dashboard.erro?.mensagem).toBeTruthy();
      expect(visao.dashboard.dados).toBeNull();
      // o relatório continua carregando normalmente
      expect(visao.analitico.erro).toBeNull();
      done();
    });
  });

  describe('propagação dos filtros', () => {
    it('recarrega dashboard e analítico ao aplicar um filtro', () => {
      fixture.detectChanges();
      const antes = servico.filtrosDoDashboard.length;

      componente.aplicarFiltros({ produtos: ['CARTAO'] });

      expect(servico.filtrosDoDashboard.length).toBe(antes + 1);
      expect(servico.filtrosDoDashboard.at(-1)?.produtos).toEqual(['CARTAO']);
      expect(servico.filtrosDoAnalitico.at(-1)?.produtos).toEqual(['CARTAO']);
    });

    it('volta para a primeira página quando o recorte muda', () => {
      fixture.detectChanges();
      componente.mudarPagina({ pagina: 3 });
      expect(servico.paginasPedidas.at(-1)?.pagina).toBe(3);

      componente.aplicarFiltros({ origens: ['DIGITAL'] });

      expect(servico.paginasPedidas.at(-1)?.pagina).toBe(0);
    });

    it('limpar filtros volta ao estado inicial, inclusive a janela de tempo', () => {
      fixture.detectChanges();
      componente.aplicarFiltros({ de: '2026-03-01', ate: '2026-04-30', produtos: ['CARTAO'], periodo: '2026-03' });

      componente.limparFiltros();

      const ultimo = servico.filtrosDoDashboard.at(-1);
      const padrao = filtrosPadrao();
      // O botão aparece por qualquer desvio do padrão — inclusive um período
      // trocado no calendário —, então ele precisa devolver tudo.
      expect(ultimo?.de).toBe(padrao.de);
      expect(ultimo?.ate).toBe(padrao.ate);
      expect(ultimo?.produtos).toEqual([]);
      expect(ultimo?.periodo).toBeNull();
    });
  });

  describe('cross-filter por período', () => {
    it('clicar num ponto recorta dashboard e analítico juntos', () => {
      fixture.detectChanges();

      componente.alternarPeriodo('2026-08');

      expect(servico.filtrosDoDashboard.at(-1)?.periodo).toBe('2026-08');
      expect(servico.filtrosDoAnalitico.at(-1)?.periodo).toBe('2026-08');
    });

    it('clicar no mesmo ponto de novo desfaz o recorte', () => {
      fixture.detectChanges();
      componente.alternarPeriodo('2026-08');

      componente.alternarPeriodo('2026-08');

      expect(servico.filtrosDoDashboard.at(-1)?.periodo).toBeNull();
    });

    it('clicar noutro ponto troca o recorte em vez de acumular', () => {
      fixture.detectChanges();
      componente.alternarPeriodo('2026-08');

      componente.alternarPeriodo('2026-09');

      expect(servico.filtrosDoDashboard.at(-1)?.periodo).toBe('2026-09');
    });
  });

  describe('cross-filter dos cards de composição', () => {
    it('clicar num item recorta a página inteira por ele', () => {
      fixture.detectChanges();

      componente.alternarDimensao('origens', 'AGENCIA');

      expect(servico.filtrosDoDashboard.at(-1)?.origens).toEqual(['AGENCIA']);
      expect(servico.filtrosDoAnalitico.at(-1)?.origens).toEqual(['AGENCIA']);
    });

    it('clicar no item já recortado desfaz', () => {
      fixture.detectChanges();
      componente.alternarDimensao('origens', 'AGENCIA');

      componente.alternarDimensao('origens', 'AGENCIA');

      expect(servico.filtrosDoDashboard.at(-1)?.origens).toEqual([]);
    });

    it('clicar noutro item da mesma dimensão substitui, não soma', () => {
      fixture.detectChanges();
      componente.alternarDimensao('produtos', 'CARTAO');

      componente.alternarDimensao('produtos', 'SEGUROS');

      expect(servico.filtrosDoDashboard.at(-1)?.produtos).toEqual(['SEGUROS']);
    });

    it('dimensões diferentes se acumulam', () => {
      fixture.detectChanges();

      componente.alternarDimensao('origens', 'AGENCIA');
      componente.alternarDimensao('riscos', 'COMPLIANCE');

      const ultimo = servico.filtrosDoDashboard.at(-1);
      expect(ultimo?.origens).toEqual(['AGENCIA']);
      expect(ultimo?.riscos).toEqual(['COMPLIANCE']);
    });

    it('destaca o item apenas quando ele é o único recorte da dimensão', () => {
      expect(componente.recorteUnico(['AGENCIA'])).toBe('AGENCIA');
      // Com dois selecionados pela barra, destacar um só mentiria sobre o
      // recorte aplicado.
      expect(componente.recorteUnico(['AGENCIA', 'DIGITAL'])).toBeNull();
      expect(componente.recorteUnico([])).toBeNull();
    });
  });

  describe('seletor segmentado de período', () => {
    it('aplica janela e granularidade juntas', () => {
      fixture.detectChanges();

      componente.escolherPeriodo({ de: '2026-08-16', ate: '2026-09-14', granularidade: 'dia' });

      const ultimo = servico.filtrosDoDashboard.at(-1);
      expect(ultimo?.de).toBe('2026-08-16');
      expect(ultimo?.granularidade).toBe('dia');
    });

    it('trocar de janela descarta o recorte de ponto — a chave pode não existir mais', () => {
      fixture.detectChanges();
      componente.alternarPeriodo('2026-08');

      componente.escolherPeriodo({ de: '2026-08-16', ate: '2026-09-14', granularidade: 'dia' });

      expect(servico.filtrosDoDashboard.at(-1)?.periodo).toBeNull();
    });
  });

  describe('sincronia com a URL', () => {
    it('espelha o recorte nos query params, sem empilhar histórico', fakeAsync(() => {
      const navegar = spyOn(roteador, 'navigate').and.resolveTo(true);
      fixture.detectChanges();

      componente.aplicarFiltros({ produtos: ['CARTAO'], periodo: '2026-08' });
      tick();

      expect(navegar).toHaveBeenCalled();
      const [, extras] = navegar.calls.mostRecent().args;
      expect(extras?.queryParams?.['produto']).toBe('CARTAO');
      expect(extras?.queryParams?.['periodo']).toBe('2026-08');
      expect(extras?.replaceUrl).toBeTrue();
    }));
  });

  describe('stale-while-revalidate', () => {
    it('mantém o dado anterior na tela durante a recarga, em vez de voltar ao skeleton', () => {
      fixture.detectChanges();

      const emissoes: Array<{ carregando: boolean; atualizando: boolean; temDados: boolean }> = [];
      const assinatura = componente.visao$.subscribe((visao) =>
        emissoes.push({
          carregando: visao.dashboard.carregando,
          atualizando: visao.dashboard.atualizando,
          temDados: visao.dashboard.dados !== null,
        }),
      );

      componente.aplicarFiltros({ produtos: ['CARTAO'] });
      assinatura.unsubscribe();

      // nenhuma emissão pós-carga pode esvaziar a tela: é isso que fazia o
      // layout encolher e a rolagem saltar a cada clique de filtro
      expect(emissoes.length).toBeGreaterThan(1);
      expect(emissoes.every((e) => e.temDados)).toBeTrue();
      expect(emissoes.some((e) => e.atualizando)).toBeTrue();
      expect(emissoes.some((e) => e.carregando)).toBeFalse();
    });

    it('a primeira carga termina resolvida, sem erro nem estado pendente', () => {
      // O dublê usa `of()` síncrono: carregando -> pronto colapsam no mesmo
      // tick de RxJS antes do subscribe capturar o intermediário. O que
      // importa verificar aqui é o estado final, não o transiente.
      let ultima: { carregando: boolean; dados: unknown } | undefined;
      componente.visao$.subscribe((visao) => (ultima = visao.dashboard));

      fixture.detectChanges();

      expect(ultima?.carregando).toBeFalse();
      expect(ultima?.dados).not.toBeNull();
    });

    it('erro limpa os dados de propósito — número velho não pode passar por atual', (done) => {
      fixture.detectChanges();
      servico.falharDashboard = true;

      componente.aplicarFiltros({ produtos: ['CARTAO'] });

      componente.visao$.subscribe((visao) => {
        expect(visao.dashboard.dados).toBeNull();
        expect(visao.dashboard.atualizando).toBeFalse();
        expect(visao.dashboard.erro).not.toBeNull();
        done();
      });
    });
  });

  it('recarregar redispara todas as chamadas', () => {
    fixture.detectChanges();
    const antes = servico.filtrosDoDashboard.length;

    componente.recarregar();

    expect(servico.filtrosDoDashboard.length).toBeGreaterThan(antes);
  });
});
