import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { Observable, filter, of, take, throwError } from 'rxjs';

registerLocaleData(localePt, 'pt-BR');
import { InicioService } from '../../data/inicio.service';
import { ResumoInicioDto, UltimaAnaliseDto } from '../../models/inicio.dto';
import { PaginaInicioComponent } from './pagina-inicio.component';

function resumoFalso(pecasAnalisadas: number): ResumoInicioDto {
  return {
    geradoEm: '2026-09-15T12:00:00.000Z',
    ano: 2026,
    uso: {
      pecasAnalisadas,
      pecasAprovadas: pecasAnalisadas,
      pecasReprovadas: 0,
      percentualConformidade: 100,
      tempoMedioSegundos: 32,
      pecasMesCorrente: 60,
      pecasMesAnterior: 50,
      desde: '2024-08-01',
    },
    serieMensal: [
      { competencia: '2026-08', rotulo: 'ago/26', total: 50, aprovadas: 45, reprovadas: 5, tempoMedioSegundos: 30 },
      { competencia: '2026-09', rotulo: 'set/26', total: 60, aprovadas: 55, reprovadas: 5, tempoMedioSegundos: 34 },
    ],
    configuracao: {
      modelos: [
        { chave: 'A', rotulo: 'Claude Sonnet', papel: 'Análise', participacaoPercentual: 84.1 },
        { chave: 'GEMINI_38FLASH', rotulo: 'Gemini 3.8 Flash', papel: 'Triagem secundária', participacaoPercentual: 12.4, logo: 'gemini' },
        { chave: 'GEMINI_31PRO', rotulo: 'Gemini 3.1 Pro', papel: 'Validação cruzada', participacaoPercentual: 3.5, logo: 'gemini' },
      ],
      tempoMedioSegundos: 32,
      versaoPrompt: 'v3.2.1',
      janelaDados: { de: '2024-08-01', ate: '2026-09-15' },
      atualizadoEm: '2026-09-15T12:00:00.000Z',
    },
  };
}

class ServicoFalso extends InicioService {
  pecasAnalisadas = 800;
  falhar = false;

  carregarResumo(): Observable<ResumoInicioDto> {
    return this.falhar ? throwError(() => new Error('falhou')) : of(resumoFalso(this.pecasAnalisadas));
  }

  carregarUltimasAnalises(): Observable<UltimaAnaliseDto[]> {
    return of([
      { id: 'PC-1', produto: { chave: 'CARTAO', rotulo: 'Cartão de Crédito' }, dataAvaliacao: '2026-10-05T10:00:00', resultado: 'APROVADA' },
    ]);
  }
}

describe('PaginaInicioComponent', () => {
  let fixture: ComponentFixture<PaginaInicioComponent>;
  let componente: PaginaInicioComponent;
  let servico: ServicoFalso;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [RouterTestingModule.withRoutes([]), MatDialogModule, PaginaInicioComponent],
    providers: [
        { provide: InicioService, useClass: ServicoFalso },
        { provide: LOCALE_ID, useValue: 'pt-BR' },
    ],
    schemas: [NO_ERRORS_SCHEMA]
}).compileComponents();

    fixture = TestBed.createComponent(PaginaInicioComponent);
    componente = fixture.componentInstance;
    servico = TestBed.inject(InicioService) as unknown as ServicoFalso;
  });

  it('expõe view-model com resumo resolvido', (done) => {
    fixture.detectChanges();

    componente.visao$.subscribe((visao) => {
      expect(visao.resumo.dados?.uso.pecasAnalisadas).toBe(800);
      expect(visao.resumo.carregando).toBeFalse();
      expect(visao.resumo.erro).toBeNull();
      done();
    });
  });

  it('preenche usuário e saudação', (done) => {
    fixture.detectChanges();

    componente.visao$.subscribe((visao) => {
      expect(visao.usuario.primeiroNome).toBeTruthy();
      expect(visao.saudacao).toMatch(/Bom dia|Boa tarde|Boa noite/);
      done();
    });
  });

  it('monta KPIs e resumo do pipeline', (done) => {
    fixture.detectChanges();

    componente.visao$.pipe(filter((v) => !!v.resumo.dados), take(1)).subscribe((visao) => {
      expect(visao.kpis?.tempoMedio.valor).toBe(32);
      expect(visao.kpis?.analises.valor).toBe(800);
      expect(visao.pipeline).toEqual({ agentes: 3, detalhe: 'RAG · Prompt v3.2.1' });
      done();
    });
  });

  it('converte erro do resumo em estado exibível', (done) => {
    servico.falhar = true;
    fixture.detectChanges();

    componente.visao$.pipe(filter((v) => !!v.resumo.erro), take(1)).subscribe((visao) => {
      expect(visao.kpis).toBeNull();
      expect(visao.pipeline).toBeNull();
      done();
    });
  });

  it('abre o gráfico de análises com a série mensal e a métrica "total"', () => {
    const dialogo = TestBed.inject(MatDialog);
    spyOn(dialogo, 'open');
    const resumo = resumoFalso(800);

    componente.abrirGraficoAnalises(resumo);

    expect(dialogo.open).toHaveBeenCalled();
    const [, opcoes] = (dialogo.open as jasmine.Spy).calls.mostRecent().args;
    expect(opcoes.data.metrica).toBe('total');
    expect(opcoes.data.pontos).toBe(resumo.serieMensal);
    expect(opcoes.data.titulo).toContain('2026');
  });

  it('abre o gráfico de tempo médio com a métrica "tempoMedioSegundos"', () => {
    const dialogo = TestBed.inject(MatDialog);
    spyOn(dialogo, 'open');

    componente.abrirGraficoTempoMedio(resumoFalso(800));

    expect(dialogo.open).toHaveBeenCalled();
    const [, opcoes] = (dialogo.open as jasmine.Spy).calls.mostRecent().args;
    expect(opcoes.data.metrica).toBe('tempoMedioSegundos');
  });

  it('não abre gráficos quando o resumo ainda não carregou', () => {
    const dialogo = TestBed.inject(MatDialog);
    spyOn(dialogo, 'open');

    componente.abrirGraficoAnalises(null);
    componente.abrirGraficoTempoMedio(undefined);

    expect(dialogo.open).not.toHaveBeenCalled();
  });

  it('abre o diálogo do pipeline com a configuração completa', () => {
    const dialogo = TestBed.inject(MatDialog);
    spyOn(dialogo, 'open');
    const { configuracao } = resumoFalso(800);

    componente.abrirPipeline(configuracao);

    const [, opcoes] = (dialogo.open as jasmine.Spy).calls.mostRecent().args;
    expect(opcoes.data.configuracao).toBe(configuracao);
  });

  it('não abre o diálogo do pipeline sem configuração', () => {
    const dialogo = TestBed.inject(MatDialog);
    spyOn(dialogo, 'open');

    componente.abrirPipeline(null);

    expect(dialogo.open).not.toHaveBeenCalled();
  });

  it('mantém o card institucional e some com os KPIs quando o resumo falha', () => {
    servico.falhar = true;
    const novo = TestBed.createComponent(PaginaInicioComponent);
    novo.detectChanges();

    expect(novo.nativeElement.querySelector('ini-como-funciona')).not.toBeNull();
    expect(novo.nativeElement.querySelector('ini-ultimas-analises')).not.toBeNull();
    expect(novo.nativeElement.querySelectorAll('ini-tile-kpi').length).toBe(0);
  });

  it('expõe as últimas análises e 3 atalhos com query params por dimensão', (done) => {
    expect(componente.atalhos.map((a) => a.id)).toEqual(['ultimos-30-dias', 'risco-compliance', 'avaliar-peca']);
    expect(componente.atalhos[0].queryParams).toEqual(jasmine.objectContaining({ granularidade: 'dia' }));
    expect(componente.atalhos[1].queryParams).toEqual({ risco: 'COMPLIANCE' });

    componente.visao$.pipe(filter((v) => !!v.ultimas.dados), take(1)).subscribe((visao) => {
      expect(visao.ultimas.dados?.[0].id).toBe('PC-1');
      done();
    });
  });

  it('renderiza hero e 4 KPIs quando o resumo carrega', () => {
    const novo = TestBed.createComponent(PaginaInicioComponent);
    novo.detectChanges();

    expect(novo.nativeElement.querySelector('ini-hero')).not.toBeNull();
    expect(novo.nativeElement.querySelectorAll('ini-tile-kpi').length).toBe(4);
  });
});
