import { HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { mapearErro } from '../../../core/models/erro-carregamento.model';
import { FiltrosGraficos } from '../models/filtros.model';
import { DashboardGraficosDto, PaginaDto, LinhaAnaliticoDto } from '../models/graficos-executivos.dto';
import { GraficosExecutivosHttpService } from './graficos-executivos-http.service';

describe('GraficosExecutivosHttpService', () => {
  let servico: GraficosExecutivosHttpService;
  let http: HttpTestingController;

  const filtros: FiltrosGraficos = {
    de: '2026-01-01',
    ate: '2026-09-14',
    granularidade: 'mes',
    produtos: ['CARTAO', 'SEGUROS'],
    origens: ['DIGITAL'],
    riscos: [],
    periodo: '2026-08',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GraficosExecutivosHttpService],
    });
    servico = TestBed.inject(GraficosExecutivosHttpService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('busca o dashboard no path relativo do BFF', () => {
    servico.carregarDashboard(filtros).subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/graficos-executivos');
    expect(requisicao.request.method).toBe('GET');
    http.expectNone('/api/graficos-executivos/filtros');
    requisicao.flush({} as DashboardGraficosDto);
  });

  it('envia a granularidade diária quando a visão é por dia', () => {
    servico.carregarDashboard({ ...filtros, granularidade: 'dia', periodo: '2026-08-12' }).subscribe();

    const { params } = http.expectOne((r) => r.url === '/api/graficos-executivos').request;
    expect(params.get('granularidade')).toBe('dia');
    expect(params.get('periodo')).toBe('2026-08-12');
  });

  it('serializa os filtros como query params, listas em CSV', () => {
    servico.carregarDashboard(filtros).subscribe();

    const { params } = http.expectOne((r) => r.url === '/api/graficos-executivos').request;
    expect(params.get('de')).toBe('2026-01-01');
    expect(params.get('ate')).toBe('2026-09-14');
    expect(params.get('produto')).toBe('CARTAO,SEGUROS');
    expect(params.get('origem')).toBe('DIGITAL');
    expect(params.get('periodo')).toBe('2026-08');
    expect(params.get('granularidade')).toBe('mes');

    http.expectNone((r) => r.params.has('risco'));
  });

  it('omite filtros vazios em vez de enviar parâmetro em branco', () => {
    servico.carregarDashboard({ ...filtros, produtos: [], origens: [], riscos: [], periodo: null }).subscribe();

    const { params } = http.expectOne((r) => r.url === '/api/graficos-executivos').request;
    expect(params.has('produto')).toBeFalse();
    expect(params.has('origem')).toBeFalse();
    expect(params.has('risco')).toBeFalse();
    expect(params.has('periodo')).toBeFalse();
    // granularidade NÃO é omitida: o BFF precisa saber como bucketizar a série
    expect(params.get('granularidade')).toBe('mes');
  });

  it('envia paginação e ordenação junto do recorte no analítico', () => {
    servico
      .carregarAnalitico(filtros, { pagina: 2, tamanho: 25, ordenarPor: 'produto', direcao: 'asc' })
      .subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/graficos-executivos/analitico');
    const { params } = requisicao.request;
    expect(params.get('pagina')).toBe('2');
    expect(params.get('tamanho')).toBe('25');
    expect(params.get('ordenarPor')).toBe('produto');
    expect(params.get('direcao')).toBe('asc');
    // o recorte continua valendo para a tabela
    expect(params.get('produto')).toBe('CARTAO,SEGUROS');

    requisicao.flush({ conteudo: [], pagina: 2, tamanho: 25, totalElementos: 0, totalPaginas: 1 } as PaginaDto<LinhaAnaliticoDto>);
  });

  it('busca as opções de filtro no sub-recurso /filtros', () => {
    servico.carregarOpcoesFiltro().subscribe();
    http.expectOne('/api/graficos-executivos/filtros').flush({
      produtos: [], origens: [], riscos: [], periodoDisponivel: { de: '2025-01-01', ate: '2026-09-14' },
    });
  });

  it('propaga o erro HTTP para o chamador mapear', (done) => {
    servico.carregarDashboard(filtros).subscribe({
      error: (erro: unknown) => {
        expect(erro).toBeInstanceOf(HttpErrorResponse);
        const mapeado = mapearErro(erro);
        expect(mapeado.status).toBe(503);
        expect(mapeado.permiteNovaTentativa).toBeTrue();
        done();
      },
    });

    http.expectOne((r) => r.url === '/api/graficos-executivos')
      .flush('indisponível', { status: 503, statusText: 'Service Unavailable' });
  });
});
