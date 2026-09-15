import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardOrigemResultadoComponent } from './card-origem-resultado.component';

describe('CardOrigemResultadoComponent', () => {
  let fixture: ComponentFixture<CardOrigemResultadoComponent>;
  let componente: CardOrigemResultadoComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CardOrigemResultadoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardOrigemResultadoComponent);
    componente = fixture.componentInstance;
  });

  it('ordena as origens por % de reprovação, do maior para o menor — não pelo volume', () => {
    componente.itens = [
      // AGENCIA tem bem mais volume (50 peças), mas taxa de reprovação menor
      // — precisa vir DEPOIS de PARCEIRO, que tem 1/5 do volume.
      { chave: 'AGENCIA', rotulo: 'Agência', aprovadas: 45, reprovadas: 5 }, // 10%
      { chave: 'PARCEIRO', rotulo: 'Parceiro', aprovadas: 6, reprovadas: 4 }, // 40%
    ];

    componente.ngOnChanges();

    expect(componente.linhas.map((l) => l.chave)).toEqual(['PARCEIRO', 'AGENCIA']);
  });

  it('calcula a taxa de reprovação de cada origem', () => {
    componente.itens = [
      { chave: 'PARCEIRO', rotulo: 'Parceiro', aprovadas: 6, reprovadas: 4 },
    ];

    componente.ngOnChanges();

    expect(componente.linhas[0]?.total).toBe(10);
    expect(componente.linhas[0]?.percentualReprovacao).toBe(40);
  });

  it('não divide por zero numa origem sem peças', () => {
    componente.itens = [{ chave: 'VAZIA', rotulo: 'Vazia', aprovadas: 0, reprovadas: 0 }];

    componente.ngOnChanges();

    expect(componente.linhas[0]?.percentualReprovacao).toBe(0);
  });

  it('lida com lista vazia sem quebrar', () => {
    componente.itens = [];

    componente.ngOnChanges();

    expect(componente.linhas).toEqual([]);
    expect(componente.tracos).toEqual([]);
    expect(componente.descricaoAcessivel).toBe('Sem dados.');
  });

  describe('KPI agregado do topo', () => {
    it('soma o total geral do recorte', () => {
      componente.itens = [
        { chave: 'A', rotulo: 'A', aprovadas: 8, reprovadas: 2, totalPeriodoAnterior: 10 },
        { chave: 'B', rotulo: 'B', aprovadas: 15, reprovadas: 5, totalPeriodoAnterior: 20 },
      ];

      componente.ngOnChanges();

      expect(componente.totalGeral).toBe(30);
    });

    it('calcula a variação agregada quando toda origem tem período anterior', () => {
      componente.itens = [
        { chave: 'A', rotulo: 'A', aprovadas: 8, reprovadas: 2, totalPeriodoAnterior: 5 }, // 10 vs 5
      ];

      componente.ngOnChanges();

      expect(componente.variacaoGeral).toBe(100); // dobrou
    });

    it('omite a variação agregada quando falta período anterior em alguma origem', () => {
      componente.itens = [
        { chave: 'A', rotulo: 'A', aprovadas: 8, reprovadas: 2, totalPeriodoAnterior: 5 },
        { chave: 'B', rotulo: 'B', aprovadas: 3, reprovadas: 1 }, // sem totalPeriodoAnterior
      ];

      componente.ngOnChanges();

      expect(componente.variacaoGeral).toBeNull();
    });
  });

  describe('coluna Δ — variação da taxa de reprovação (p.p.)', () => {
    it('calcula a diferença em pontos percentuais entre a taxa atual e a anterior', () => {
      componente.itens = [
        // atual: 2/10 = 20%. anterior: 1/10 = 10%. delta = +10 p.p.
        { chave: 'A', rotulo: 'A', aprovadas: 8, reprovadas: 2, totalPeriodoAnterior: 10, reprovadasPeriodoAnterior: 1 },
      ];

      componente.ngOnChanges();

      expect(componente.linhas[0]?.variacaoTaxaReprovacao).toBe(10);
    });

    it('taxa que caiu dá delta negativo (queda = bom = verde na UI)', () => {
      componente.itens = [
        // atual: 1/10 = 10%. anterior: 5/10 = 50%. delta = -40 p.p.
        { chave: 'A', rotulo: 'A', aprovadas: 9, reprovadas: 1, totalPeriodoAnterior: 10, reprovadasPeriodoAnterior: 5 },
      ];

      componente.ngOnChanges();

      expect(componente.linhas[0]?.variacaoTaxaReprovacao).toBe(-40);
    });

    it('fica em 0 quando a taxa não mudou', () => {
      componente.itens = [
        { chave: 'A', rotulo: 'A', aprovadas: 8, reprovadas: 2, totalPeriodoAnterior: 20, reprovadasPeriodoAnterior: 4 },
      ];

      componente.ngOnChanges();

      expect(componente.linhas[0]?.variacaoTaxaReprovacao).toBe(0);
    });

    it('fica null quando falta total OU reprovadas do período anterior — não inventa tendência', () => {
      componente.itens = [
        { chave: 'A', rotulo: 'A', aprovadas: 8, reprovadas: 2, totalPeriodoAnterior: 10 }, // sem reprovadasPeriodoAnterior
        { chave: 'B', rotulo: 'B', aprovadas: 8, reprovadas: 2 }, // sem nenhum dos dois
      ];

      componente.ngOnChanges();

      expect(componente.linhas[0]?.variacaoTaxaReprovacao).toBeNull();
      expect(componente.linhas[1]?.variacaoTaxaReprovacao).toBeNull();
    });

    it('trata período anterior sem nenhuma peça como taxa anterior 0%', () => {
      componente.itens = [
        { chave: 'A', rotulo: 'A', aprovadas: 5, reprovadas: 5, totalPeriodoAnterior: 0, reprovadasPeriodoAnterior: 0 },
      ];

      componente.ngOnChanges();

      // atual 50%, anterior 0% -> +50 p.p.
      expect(componente.linhas[0]?.variacaoTaxaReprovacao).toBe(50);
    });
  });

  describe('barra segmentada em traços (tick bar)', () => {
    it('distribui 40 traços proporcionalmente ao volume de cada origem', () => {
      componente.itens = [
        { chave: 'A', rotulo: 'A', aprovadas: 75, reprovadas: 0 }, // 75%
        { chave: 'B', rotulo: 'B', aprovadas: 25, reprovadas: 0 }, // 25%
      ];

      componente.ngOnChanges();

      expect(componente.tracos.length).toBe(40);
      const cores = componente.tracos.map((t) => t.cor);
      const corA = componente.linhas[0]?.cor;
      const qtdA = cores.filter((c) => c === corA).length;
      expect(qtdA).toBe(30); // 75% de 40
    });

    it('não perde nem sobra traço por arredondamento (maior resto)', () => {
      componente.itens = [
        { chave: 'A', rotulo: 'A', aprovadas: 1, reprovadas: 0 },
        { chave: 'B', rotulo: 'B', aprovadas: 1, reprovadas: 0 },
        { chave: 'C', rotulo: 'C', aprovadas: 1, reprovadas: 0 },
      ];

      componente.ngOnChanges();

      expect(componente.tracos.length).toBe(40);
    });
  });
});
