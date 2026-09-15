import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgChartsModule } from 'ng2-charts';
import { CardReprovacaoRiscoComponent } from './card-reprovacao-risco.component';

describe('CardReprovacaoRiscoComponent', () => {
  let fixture: ComponentFixture<CardReprovacaoRiscoComponent>;
  let componente: CardReprovacaoRiscoComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgChartsModule],
      declarations: [CardReprovacaoRiscoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardReprovacaoRiscoComponent);
    componente = fixture.componentInstance;
  });

  it('calcula a participação de cada risco no total de reprovadas (composição, não taxa)', () => {
    componente.itens = [
      { chave: 'BAIXO', rotulo: 'Baixo', ordem: 1, total: 100, reprovadas: 10, percentualReprovacao: 10 },
      { chave: 'ALTO', rotulo: 'Alto', ordem: 2, total: 20, reprovadas: 10, percentualReprovacao: 50 },
    ];

    componente.ngOnChanges();

    // Mesmo volume de reprovadas (10 e 10) -> mesma fatia no donut (50/50),
    // mesmo a taxa sendo bem diferente (10% vs 50%). É essa a distinção que o
    // formato composição introduz sobre o formato taxa anterior.
    expect(componente.totalReprovadas).toBe(20);
    expect(componente.fatias.map((f) => f.percentualDoTotal)).toEqual([50, 50]);
  });

  it('ordena as fatias pela % exibida na legenda (composição), do maior para o menor — não pela ordem do BFF', () => {
    componente.itens = [
      // CONDUTA tem taxa de reprovação MAIOR (100% vs. 40%), mas o que a
      // legenda mostra é composição (participação no total de reprovadas), e
      // nisso COMPLIANCE lidera (20 reprovadas vs. 5) — precisa vir primeiro.
      { chave: 'COMPLIANCE', rotulo: 'Risco de Compliance e Regulatório', ordem: 1, total: 50, reprovadas: 20, percentualReprovacao: 40 },
      { chave: 'CONDUTA', rotulo: 'Risco de Conduta', ordem: 4, total: 5, reprovadas: 5, percentualReprovacao: 100 },
    ];

    componente.ngOnChanges();

    expect(componente.fatias.map((f) => f.chave)).toEqual(['COMPLIANCE', 'CONDUTA']);
    expect(componente.fatias[0]?.percentualDoTotal).toBeGreaterThan(componente.fatias[1]?.percentualDoTotal ?? 0);
  });

  it('não divide por zero quando não há reprovadas', () => {
    componente.itens = [
      { chave: 'BAIXO', rotulo: 'Baixo', ordem: 1, total: 10, reprovadas: 0, percentualReprovacao: 0 },
    ];

    componente.ngOnChanges();

    expect(componente.totalReprovadas).toBe(0);
    expect(componente.fatias[0]?.percentualDoTotal).toBe(0);
  });

  it('descrição acessível aponta o risco com maior volume de reprovadas', () => {
    componente.itens = [
      { chave: 'BAIXO', rotulo: 'Baixo', ordem: 1, total: 100, reprovadas: 5, percentualReprovacao: 5 },
      { chave: 'ALTO', rotulo: 'Alto', ordem: 2, total: 30, reprovadas: 15, percentualReprovacao: 50 },
    ];

    componente.ngOnChanges();

    expect(componente.descricaoAcessivel).toContain('Alto');
  });

  describe('KPI do topo — mesma lógica do card "Origem × resultado"', () => {
    it('calcula a variação do total de reprovadas vs. período anterior', () => {
      componente.itens = [
        { chave: 'COMPLIANCE', rotulo: 'Compliance', ordem: 1, total: 40, reprovadas: 20, percentualReprovacao: 50 },
      ];
      componente.reprovadasPeriodoAnterior = 10;

      componente.ngOnChanges();

      expect(componente.variacaoGeral).toBe(100); // dobrou
    });

    it('fica null quando não há período anterior — não inventa tendência', () => {
      componente.itens = [
        { chave: 'COMPLIANCE', rotulo: 'Compliance', ordem: 1, total: 40, reprovadas: 20, percentualReprovacao: 50 },
      ];
      componente.reprovadasPeriodoAnterior = null;

      componente.ngOnChanges();

      expect(componente.variacaoGeral).toBeNull();
    });

    it('trata crescimento a partir de zero reprovadas anteriores como null (percentual não é útil)', () => {
      componente.itens = [
        { chave: 'COMPLIANCE', rotulo: 'Compliance', ordem: 1, total: 10, reprovadas: 3, percentualReprovacao: 30 },
      ];
      componente.reprovadasPeriodoAnterior = 0;

      componente.ngOnChanges();

      expect(componente.variacaoGeral).toBeNull();
    });

    it('fica em 0 quando estava zerado e continua zerado', () => {
      componente.itens = [];
      componente.reprovadasPeriodoAnterior = 0;

      componente.ngOnChanges();

      expect(componente.variacaoGeral).toBe(0);
    });
  });

  describe('cores categóricas (não mais escala de severidade)', () => {
    it('atribui cores diferentes a riscos diferentes, na ordem das fatias', () => {
      componente.itens = [
        { chave: 'COMPLIANCE', rotulo: 'Compliance', ordem: 1, total: 10, reprovadas: 5, percentualReprovacao: 50 },
        { chave: 'JURIDICO', rotulo: 'Jurídico', ordem: 2, total: 10, reprovadas: 5, percentualReprovacao: 50 },
      ];

      componente.ngOnChanges();

      const [primeira, segunda] = componente.fatias;
      expect(primeira?.cor).toBeTruthy();
      expect(segunda?.cor).toBeTruthy();
      expect(primeira?.cor).not.toBe(segunda?.cor);
    });
  });
});
