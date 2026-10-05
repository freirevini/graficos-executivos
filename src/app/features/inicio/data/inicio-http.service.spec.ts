import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ResumoInicioDto, UltimaAnaliseDto } from '../models/inicio.dto';
import { InicioHttpService } from './inicio-http.service';

describe('InicioHttpService', () => {
  let servico: InicioHttpService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [InicioHttpService],
    });
    servico = TestBed.inject(InicioHttpService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('busca o resumo no path do BFF', () => {
    servico.carregarResumo().subscribe();

    const requisicao = http.expectOne('/api/inicio/resumo');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({} as ResumoInicioDto);
  });

  it('busca as últimas análises com o limite como query param', () => {
    let recebido: UltimaAnaliseDto[] = [];
    servico.carregarUltimasAnalises(5).subscribe((r) => (recebido = r));

    const requisicao = http.expectOne((r) => r.url === '/api/inicio/ultimas-analises');
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('limite')).toBe('5');
    requisicao.flush([{ id: 'PC-1' }]);
    expect(recebido.length).toBe(1);
  });
});
