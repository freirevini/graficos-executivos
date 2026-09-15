import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardTotalProdutoComponent } from './card-total-produto.component';

describe('CardTotalProdutoComponent', () => {
  let fixture: ComponentFixture<CardTotalProdutoComponent>;
  let componente: CardTotalProdutoComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CardTotalProdutoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardTotalProdutoComponent);
    componente = fixture.componentInstance;
  });

  it('soma o volume geral a partir dos produtos, mesmo se o BFF mandar fora de ordem', () => {
    componente.itens = [
      { chave: 'SEGUROS', rotulo: 'Seguros', ordem: undefined, total: 20, reprovadas: 4, percentualReprovacao: 20 },
      { chave: 'CARTAO', rotulo: 'Cartão', ordem: undefined, total: 80, reprovadas: 16, percentualReprovacao: 20 },
    ];

    componente.ngOnChanges();

    expect(componente.totalGeral).toBe(100);
  });

  it('ordena os produtos por % de reprovação, do maior para o menor', () => {
    componente.itens = [
      { chave: 'SEGUROS', rotulo: 'Seguros', total: 100, reprovadas: 12, percentualReprovacao: 12 },
      { chave: 'CARTAO', rotulo: 'Cartão', total: 20, reprovadas: 9, percentualReprovacao: 45 }, // menor volume, maior taxa
    ];

    componente.ngOnChanges();

    expect(componente.linhas.map((l) => l.chave)).toEqual(['CARTAO', 'SEGUROS']);
  });

  it('calcula a participação de cada produto no volume total', () => {
    componente.itens = [
      { chave: 'A', rotulo: 'A', total: 75, reprovadas: 0, percentualReprovacao: 0 },
      { chave: 'B', rotulo: 'B', total: 25, reprovadas: 0, percentualReprovacao: 0 },
    ];

    componente.ngOnChanges();

    expect(componente.linhas.find((l) => l.chave === 'A')?.percentualDoVolume).toBe(75);
    expect(componente.linhas.find((l) => l.chave === 'B')?.percentualDoVolume).toBe(25);
  });

  it('não divide por zero quando não há volume nenhum', () => {
    componente.itens = [];

    componente.ngOnChanges();

    expect(componente.totalGeral).toBe(0);
    expect(componente.linhas).toEqual([]);
  });

  it('descrição acessível aponta o produto líder em volume', () => {
    componente.itens = [
      { chave: 'A', rotulo: 'Cartão', total: 90, reprovadas: 9, percentualReprovacao: 10 },
      { chave: 'B', rotulo: 'Seguros', total: 10, reprovadas: 1, percentualReprovacao: 10 },
    ];

    componente.ngOnChanges();

    expect(componente.descricaoAcessivel).toContain('Cartão');
  });

  describe('KPI do topo — mesma lógica dos outros cards', () => {
    it('calcula a variação do volume total vs. período anterior', () => {
      componente.itens = [
        { chave: 'A', rotulo: 'A', total: 40, reprovadas: 0, percentualReprovacao: 0 },
      ];
      componente.totalPeriodoAnterior = 20;

      componente.ngOnChanges();

      expect(componente.variacaoGeral).toBe(100); // dobrou
    });

    it('fica null quando não há período anterior — não inventa tendência', () => {
      componente.itens = [
        { chave: 'A', rotulo: 'A', total: 40, reprovadas: 0, percentualReprovacao: 0 },
      ];
      componente.totalPeriodoAnterior = null;

      componente.ngOnChanges();

      expect(componente.variacaoGeral).toBeNull();
    });

    it('trata crescimento a partir de zero como null (percentual não é útil)', () => {
      componente.itens = [
        { chave: 'A', rotulo: 'A', total: 10, reprovadas: 0, percentualReprovacao: 0 },
      ];
      componente.totalPeriodoAnterior = 0;

      componente.ngOnChanges();

      expect(componente.variacaoGeral).toBeNull();
    });

    it('fica em 0 quando estava zerado e continua zerado', () => {
      componente.itens = [];
      componente.totalPeriodoAnterior = 0;

      componente.ngOnChanges();

      expect(componente.variacaoGeral).toBe(0);
    });
  });
});
