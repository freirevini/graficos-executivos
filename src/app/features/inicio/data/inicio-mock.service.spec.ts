import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ConfiguracaoProjetoDto, ResumoInicioDto, UltimaAnaliseDto } from '../models/inicio.dto';
import { InicioMockService } from './inicio-mock.service';

/**
 * As peças são datadas em relação a "hoje" (como o próprio gerador de mocks
 * faz), em vez de datas fixas — evita depender de mockar o relógio global,
 * que conflita com `fakeAsync`/`tick` usados para a latência simulada.
 */
const hoje = new Date();
const ano = hoje.getFullYear();
const mesCorrente = hoje.getMonth(); // 0-based
const [mesAnteriorNumero, anoMesAnterior] = mesCorrente === 0 ? [11, ano - 1] : [mesCorrente - 1, ano];

function iso(anoData: number, mesZeroBased: number, dia: number): string {
  return `${anoData}-${String(mesZeroBased + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}T10:00:00`;
}

const PECAS = [
  // Ano anterior — não deve entrar em `uso`, mas conta para `desde`.
  { dataAvaliacao: iso(ano - 1, 11, 20), resultado: 'APROVADA', duracaoAnaliseSegundos: 20 },
  // Mês anterior ao corrente.
  { dataAvaliacao: iso(anoMesAnterior, mesAnteriorNumero, 5), resultado: 'APROVADA', duracaoAnaliseSegundos: 30 },
  { dataAvaliacao: iso(anoMesAnterior, mesAnteriorNumero, 12), resultado: 'REPROVADA', duracaoAnaliseSegundos: 40 },
  // Mês corrente.
  { dataAvaliacao: iso(ano, mesCorrente, 3), resultado: 'APROVADA', duracaoAnaliseSegundos: 50 },
  { dataAvaliacao: iso(ano, mesCorrente, 10), resultado: 'APROVADA', duracaoAnaliseSegundos: 60 },
  { dataAvaliacao: iso(ano, mesCorrente, 15), resultado: 'REPROVADA', duracaoAnaliseSegundos: 70 },
];

const CONFIGURACAO: ConfiguracaoProjetoDto = {
  modelos: [
    { chave: 'A', rotulo: 'Claude Sonnet', papel: 'Análise', participacaoPercentual: 60 },
    { chave: 'B', rotulo: 'GPT-4o', papel: 'Triagem', participacaoPercentual: 40 },
  ],
  tempoMedioSegundos: 42,
  versaoPrompt: 'v3.2.1',
  janelaDados: { de: `${ano - 1}-12-20`, ate: `${ano}-09-15` },
  atualizadoEm: `${ano}-09-15T12:00:00.000Z`,
};

const RAIZ_PECAS = 'assets/mocks/graficos-executivos';
const RAIZ_INICIO = 'assets/mocks/inicio';

describe('InicioMockService', () => {
  let servico: InicioMockService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [InicioMockService],
    });
    servico = TestBed.inject(InicioMockService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function responder(): void {
    http.expectOne(`${RAIZ_PECAS}/pecas.mock.json`).flush(PECAS);
    http.expectOne(`${RAIZ_INICIO}/configuracao.mock.json`).flush(CONFIGURACAO);
    tick(environment.atrasoMockMs);
  }

  it('agrega apenas as peças do ano corrente em `uso`', fakeAsync(() => {
    let resultado: ResumoInicioDto | undefined;
    servico.carregarResumo().subscribe((r) => (resultado = r));
    responder();

    expect(resultado?.ano).toBe(ano);
    expect(resultado?.uso.pecasAnalisadas).toBe(5); // exclui a peça do ano anterior
    expect(resultado?.uso.pecasAprovadas).toBe(3);
    expect(resultado?.uso.pecasReprovadas).toBe(2);
    expect(resultado?.uso.percentualConformidade).toBe(60);
  }));

  it('calcula o tempo médio de análise só sobre o ano corrente', fakeAsync(() => {
    let resultado: ResumoInicioDto | undefined;
    servico.carregarResumo().subscribe((r) => (resultado = r));
    responder();

    // (30+40+50+60+70)/5 = 50
    expect(resultado?.uso.tempoMedioSegundos).toBe(50);
  }));

  it('compara o mês corrente com o mês anterior', fakeAsync(() => {
    let resultado: ResumoInicioDto | undefined;
    servico.carregarResumo().subscribe((r) => (resultado = r));
    responder();

    expect(resultado?.uso.pecasMesCorrente).toBe(3);
    expect(resultado?.uso.pecasMesAnterior).toBe(2);
  }));

  it('usa a data da peça mais antiga da base inteira em `desde`', fakeAsync(() => {
    let resultado: ResumoInicioDto | undefined;
    servico.carregarResumo().subscribe((r) => (resultado = r));
    responder();

    expect(resultado?.uso.desde).toBe(`${ano - 1}-12-20`);
  }));

  it('repassa a configuração do mock sem transformação', fakeAsync(() => {
    let resultado: ResumoInicioDto | undefined;
    servico.carregarResumo().subscribe((r) => (resultado = r));
    responder();

    expect(resultado?.configuracao).toEqual(CONFIGURACAO);
  }));

  it('monta a série mensal do início do ano até o mês corrente', fakeAsync(() => {
    let resultado: ResumoInicioDto | undefined;
    servico.carregarResumo().subscribe((r) => (resultado = r));
    responder();

    expect(resultado?.serieMensal.length).toBe(mesCorrente + 1);
    const ultimoPonto = resultado?.serieMensal[resultado.serieMensal.length - 1];
    expect(ultimoPonto?.competencia).toBe(`${ano}-${String(mesCorrente + 1).padStart(2, '0')}`);
    expect(ultimoPonto?.total).toBe(3);
    // (50+60+70)/3 = 60 — só as peças do mês corrente.
    expect(ultimoPonto?.tempoMedioSegundos).toBe(60);
  }));

  it('propaga falha simulada via ?simularErro=1', fakeAsync(() => {
    const historicoOriginal = window.location.href;
    window.history.pushState({}, '', '/?simularErro=1');

    let erro: unknown;
    servico.carregarResumo().subscribe({ error: (e) => (erro = e) });
    tick(environment.atrasoMockMs);

    expect(erro).toBeTruthy();
    window.history.pushState({}, '', historicoOriginal);
  }));

  it('ultimas análises: as N mais recentes, com rótulo do produto', fakeAsync(() => {
    const pecas = [
      { id: 'PC-1', produto: 'CARTAO', dataAvaliacao: '2026-01-02T10:00:00', resultado: 'APROVADA', duracaoAnaliseSegundos: 1 },
      { id: 'PC-3', produto: 'SEGUROS', dataAvaliacao: '2026-03-02T10:00:00', resultado: 'REPROVADA', duracaoAnaliseSegundos: 1 },
      { id: 'PC-2', produto: 'DESCONHECIDO', dataAvaliacao: '2026-02-02T10:00:00', resultado: 'APROVADA', duracaoAnaliseSegundos: 1 },
    ];
    let lista: UltimaAnaliseDto[] = [];
    servico.carregarUltimasAnalises(2).subscribe((r) => (lista = r));

    http.expectOne(`${RAIZ_PECAS}/pecas.mock.json`).flush(pecas);
    http.expectOne(`${RAIZ_PECAS}/filtros.mock.json`).flush({
      produtos: [{ chave: 'CARTAO', rotulo: 'Cartão de Crédito' }, { chave: 'SEGUROS', rotulo: 'Seguros' }],
    });
    tick(environment.atrasoMockMs);

    expect(lista.map((l) => l.id)).toEqual(['PC-3', 'PC-2']);
    expect(lista[0].produto).toEqual({ chave: 'SEGUROS', rotulo: 'Seguros' });
    expect(lista[1].produto.rotulo).toBe('DESCONHECIDO');
  }));
});
