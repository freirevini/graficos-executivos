import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { FiltrosGraficos } from '../models/filtros.model';
import { DashboardGraficosDto, PaginaDto, LinhaAnaliticoDto } from '../models/graficos-executivos.dto';
import { GraficosExecutivosMockService } from './graficos-executivos-mock.service';

const OPCOES = {
  produtos: [
    { chave: 'CARTAO', rotulo: 'Cartão' },
    { chave: 'SEGUROS', rotulo: 'Seguros' },
  ],
  origens: [
    { chave: 'DIGITAL', rotulo: 'Canal Digital' },
    { chave: 'AGENCIA', rotulo: 'Agência' },
  ],
  riscos: [
    { chave: 'BAIXO', rotulo: 'Baixo', ordem: 1 },
    { chave: 'ALTO', rotulo: 'Alto', ordem: 3 },
  ],
  periodoDisponivel: { de: '2026-08-01', ate: '2026-09-30' },
};

const PECAS = [
  { id: 'P1', dataAvaliacao: '2026-08-05T10:00:00', produto: 'CARTAO', origem: 'DIGITAL', riscoAtrelado: 'ALTO', resultado: 'REPROVADA', parecerIa: 'ruim', recomendacoesAjuste: 'ajuste' },
  { id: 'P2', dataAvaliacao: '2026-08-12T10:00:00', produto: 'CARTAO', origem: 'DIGITAL', riscoAtrelado: 'BAIXO', resultado: 'APROVADA', parecerIa: 'ok', recomendacoesAjuste: '' },
  { id: 'P3', dataAvaliacao: '2026-08-20T10:00:00', produto: 'SEGUROS', origem: 'AGENCIA', riscoAtrelado: 'ALTO', resultado: 'APROVADA', parecerIa: 'ok', recomendacoesAjuste: '' },
  { id: 'P4', dataAvaliacao: '2026-09-03T10:00:00', produto: 'CARTAO', origem: 'AGENCIA', riscoAtrelado: 'ALTO', resultado: 'REPROVADA', parecerIa: 'ruim', recomendacoesAjuste: 'ajuste' },
  { id: 'P5', dataAvaliacao: '2026-09-10T10:00:00', produto: 'SEGUROS', origem: 'DIGITAL', riscoAtrelado: 'BAIXO', resultado: 'APROVADA', parecerIa: 'ok', recomendacoesAjuste: '' },
];

const RAIZ = 'assets/mocks/graficos-executivos';

const FILTROS_BASE: FiltrosGraficos = {
  de: '2026-08-01',
  ate: '2026-09-30',
  granularidade: 'mes',
  produtos: [],
  origens: [],
  riscos: [],
  periodo: null,
};

describe('GraficosExecutivosMockService', () => {
  let servico: GraficosExecutivosMockService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GraficosExecutivosMockService],
    });
    servico = TestBed.inject(GraficosExecutivosMockService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Resolve as duas requisições de mock e adianta a latência simulada. */
  function responder(): void {
    http.expectOne(`${RAIZ}/pecas.mock.json`).flush(PECAS);
    http.expectOne(`${RAIZ}/filtros.mock.json`).flush(OPCOES);
    tick(environment.atrasoMockMs);
  }

  function dashboard(filtros: FiltrosGraficos): DashboardGraficosDto {
    let resultado!: DashboardGraficosDto;
    servico.carregarDashboard(filtros).subscribe((d) => (resultado = d));
    responder();
    return resultado;
  }

  it('calcula os KPIs do recorte completo', fakeAsync(() => {
    const { kpis } = dashboard(FILTROS_BASE);

    expect(kpis.totalPecas).toBe(5);
    expect(kpis.pecasAprovadas).toBe(3);
    expect(kpis.pecasReprovadas).toBe(2);
    expect(kpis.percentualReprovacao).toBe(40);
  }));

  it('monta a série temporal mês a mês, com a taxa de cada competência', fakeAsync(() => {
    const { serieTemporal } = dashboard(FILTROS_BASE);

    expect(serieTemporal.map((p) => p.periodo)).toEqual(['2026-08', '2026-09']);
    expect(serieTemporal[0]).toEqual(jasmine.objectContaining({
      aprovadas: 2, reprovadas: 1, percentualReprovacao: 33.33,
    }));
    expect(serieTemporal[1]).toEqual(jasmine.objectContaining({
      aprovadas: 1, reprovadas: 1, percentualReprovacao: 50,
    }));
  }));

  it('agrega reprovação por risco e descarta níveis sem peça', fakeAsync(() => {
    const { reprovacaoPorRisco } = dashboard(FILTROS_BASE);

    expect(reprovacaoPorRisco.length).toBe(2);
    expect(reprovacaoPorRisco.find((r) => r.chave === 'ALTO')).toEqual(jasmine.objectContaining({
      total: 3, reprovadas: 2, percentualReprovacao: 66.67,
    }));
    expect(reprovacaoPorRisco.find((r) => r.chave === 'BAIXO')?.percentualReprovacao).toBe(0);
  }));

  it('ordena os produtos do maior volume para o menor, como manda o contrato', fakeAsync(() => {
    const { totalPorProduto } = dashboard(FILTROS_BASE);

    expect(totalPorProduto.map((p) => p.chave)).toEqual(['CARTAO', 'SEGUROS']);
    expect(totalPorProduto[0]?.total).toBe(3);
    expect(totalPorProduto[0]?.percentualReprovacao).toBe(66.67);
  }));

  it('cruza origem com resultado', fakeAsync(() => {
    const { origemPorResultado } = dashboard(FILTROS_BASE);

    expect(origemPorResultado.find((o) => o.chave === 'DIGITAL')).toEqual(
      jasmine.objectContaining({ aprovadas: 2, reprovadas: 1 }),
    );
    expect(origemPorResultado.find((o) => o.chave === 'AGENCIA')).toEqual(
      jasmine.objectContaining({ aprovadas: 1, reprovadas: 1 }),
    );
  }));

  it('acompanha total e reprovadas do período anterior por origem, para a coluna Δ', fakeAsync(() => {
    // O fixture PECAS não tem nada antes de 01/08 — o período anterior de
    // igual duração cai inteiro fora da base, então toda origem some com 0.
    const { origemPorResultado } = dashboard(FILTROS_BASE);

    origemPorResultado.forEach((origem) => {
      expect(origem.totalPeriodoAnterior).toBe(0);
      expect(origem.reprovadasPeriodoAnterior).toBe(0);
    });
  }));

  it('aplica os filtros categóricos a todos os blocos', fakeAsync(() => {
    const resultado = dashboard({ ...FILTROS_BASE, produtos: ['SEGUROS'] });

    expect(resultado.kpis.totalPecas).toBe(2);
    expect(resultado.totalPorProduto.map((p) => p.chave)).toEqual(['SEGUROS']);
  }));

  describe('granularidade diária', () => {
    it('gera um ponto por dia, incluindo dias sem peça', fakeAsync(() => {
      const { serieTemporal, granularidadeSerie } = dashboard({
        ...FILTROS_BASE, de: '2026-09-01', ate: '2026-09-05', granularidade: 'dia',
      });

      expect(granularidadeSerie).toBe('dia');
      expect(serieTemporal.map((p) => p.periodo))
        .toEqual(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']);
      // 03/09 tem a peça P4 (reprovada); 01/09 não tem nenhuma
      expect(serieTemporal[2]).toEqual(jasmine.objectContaining({ aprovadas: 0, reprovadas: 1 }));
      expect(serieTemporal[0]).toEqual(jasmine.objectContaining({ aprovadas: 0, reprovadas: 0 }));
    }));

    it('rotula o eixo em dia/mês', fakeAsync(() => {
      const { serieTemporal } = dashboard({
        ...FILTROS_BASE, de: '2026-09-03', ate: '2026-09-03', granularidade: 'dia',
      });
      expect(serieTemporal[0]?.rotulo).toBe('03/09');
    }));

    it('recorta por um dia específico no cross-filter', fakeAsync(() => {
      const { kpis } = dashboard({
        ...FILTROS_BASE, granularidade: 'dia', periodo: '2026-09-03',
      });
      expect(kpis.totalPecas).toBe(1);
      expect(kpis.pecasReprovadas).toBe(1);
    }));
  });

  describe('cross-filter por mês', () => {
    it('recorta KPIs e cards para a competência clicada', fakeAsync(() => {
      const resultado = dashboard({ ...FILTROS_BASE, periodo: '2026-09' });

      expect(resultado.kpis.totalPecas).toBe(2);
      expect(resultado.kpis.pecasReprovadas).toBe(1);
      expect(resultado.kpis.percentualReprovacao).toBe(50);
      expect(resultado.totalPorProduto.reduce((s, p) => s + p.total, 0)).toBe(2);
    }));

    it('preserva a série temporal inteira, para o usuário poder trocar de mês', fakeAsync(() => {
      const resultado = dashboard({ ...FILTROS_BASE, periodo: '2026-09' });

      expect(resultado.serieTemporal.map((p) => p.periodo)).toEqual(['2026-08', '2026-09']);
      expect(resultado.serieTemporal[0]?.aprovadas).toBe(2);
    }));
  });

  describe('relatório analítico', () => {
    function pagina(
      filtros: FiltrosGraficos,
      parametros = { pagina: 0, tamanho: 10, ordenarPor: 'dataAvaliacao' as const, direcao: 'desc' as const },
    ): PaginaDto<LinhaAnaliticoDto> {
      let resultado!: PaginaDto<LinhaAnaliticoDto>;
      servico.carregarAnalitico(filtros, parametros).subscribe((p) => (resultado = p));
      responder();
      return resultado;
    }

    it('resolve os rótulos das dimensões', fakeAsync(() => {
      const primeira = pagina(FILTROS_BASE).conteudo[0];
      expect(primeira?.produto.rotulo).toBe('Seguros');
      expect(primeira?.riscoAtrelado.rotulo).toBe('Baixo');
    }));

    it('ordena por data decrescente por padrão', fakeAsync(() => {
      expect(pagina(FILTROS_BASE).conteudo.map((l) => l.id)).toEqual(['P5', 'P4', 'P3', 'P2', 'P1']);
    }));

    it('respeita o recorte de mês', fakeAsync(() => {
      const resultado = pagina({ ...FILTROS_BASE, periodo: '2026-08' });
      expect(resultado.totalElementos).toBe(3);
      expect(resultado.conteudo.every((l) => l.dataAvaliacao.startsWith('2026-08'))).toBeTrue();
    }));

    it('pagina sobre o total filtrado', fakeAsync(() => {
      const resultado = pagina(FILTROS_BASE, {
        pagina: 1, tamanho: 2, ordenarPor: 'dataAvaliacao', direcao: 'desc',
      });

      expect(resultado.conteudo.map((l) => l.id)).toEqual(['P3', 'P2']);
      expect(resultado.totalElementos).toBe(5);
      expect(resultado.totalPaginas).toBe(3);
    }));
  });
});
