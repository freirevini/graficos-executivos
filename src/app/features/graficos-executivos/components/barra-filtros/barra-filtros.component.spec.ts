import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { BarraFiltrosComponent } from './barra-filtros.component';
import { FiltrosGraficos, filtrosPadrao } from '../../models/filtros.model';
import { OpcoesFiltroDto } from '../../models/graficos-executivos.dto';

const OPCOES: OpcoesFiltroDto = {
  produtos: [
    { chave: 'CARTAO', rotulo: 'Cartão de Crédito', ordem: 1 },
    { chave: 'SEGUROS', rotulo: 'Seguros', ordem: 2 },
  ],
  origens: [{ chave: 'AGENCIA', rotulo: 'Agência', ordem: 1 }],
  riscos: [{ chave: 'COMPLIANCE', rotulo: 'Risco de Compliance e Regulatório', ordem: 1 }],
  periodoDisponivel: { de: '2026-01-01', ate: '2026-09-14' },
};

const FILTROS: FiltrosGraficos = {
  de: '2026-01-01',
  ate: '2026-09-14',
  granularidade: 'mes',
  produtos: [],
  origens: [],
  riscos: [],
  periodo: null,
};

describe('BarraFiltrosComponent', () => {
  let fixture: ComponentFixture<BarraFiltrosComponent>;
  let componente: BarraFiltrosComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [BarraFiltrosComponent],
      // Só a lógica interessa aqui (chips, resumo, remoção); os componentes
      // do Material do template não precisam ser instanciados.
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(BarraFiltrosComponent);
    componente = fixture.componentInstance;
    componente.opcoes = OPCOES;
  });

  describe('chips dos filtros aplicados', () => {
    it('traduz a chave para o rótulo que veio do BFF', () => {
      componente.filtros = { ...FILTROS, produtos: ['CARTAO'], origens: ['AGENCIA'] };

      expect(componente.chipsAtivos.map((c) => c.rotulo)).toEqual(['Cartão de Crédito', 'Agência']);
    });

    it('cai na própria chave quando as opções ainda não chegaram', () => {
      componente.opcoes = null;
      componente.filtros = { ...FILTROS, produtos: ['CARTAO'] };

      expect(componente.chipsAtivos[0]?.rotulo).toBe('CARTAO');
    });

    it('inclui o recorte do gráfico como chip, formatado para leitura', () => {
      componente.filtros = { ...FILTROS, periodo: '2026-03' };

      const recorte = componente.chipsAtivos.find((c) => c.tipo === 'recorte');
      expect(recorte?.rotulo).toBe('mar/26');
    });

    it('formata recorte diário como data curta', () => {
      componente.filtros = { ...FILTROS, granularidade: 'dia', periodo: '2026-03-12' };

      expect(componente.chipsAtivos.find((c) => c.tipo === 'recorte')?.rotulo).toBe('12/03/26');
    });

    it('fica vazio quando não há filtro aplicado', () => {
      componente.filtros = FILTROS;

      expect(componente.chipsAtivos).toEqual([]);
    });
  });

  describe('resumo da seleção no campo', () => {
    it('mostra o nome sozinho quando há um selecionado', () => {
      componente.filtros = { ...FILTROS, produtos: ['CARTAO'] };

      expect(componente.resumoSelecao('produtos')).toBe('Cartão de Crédito');
    });

    it('mostra "primeiro +N" quando há vários — não a lista truncada', () => {
      componente.filtros = { ...FILTROS, produtos: ['CARTAO', 'SEGUROS'] };

      expect(componente.resumoSelecao('produtos')).toBe('Cartão de Crédito +1');
    });

    it('fica vazio sem seleção, para o label do campo aparecer', () => {
      componente.filtros = FILTROS;

      expect(componente.resumoSelecao('produtos')).toBe('');
    });
  });

  describe('remoção individual pelo chip', () => {
    it('tira só o item clicado, preservando o resto da dimensão', () => {
      componente.filtros = { ...FILTROS, produtos: ['CARTAO', 'SEGUROS'] };

      componente.removerChip({ tipo: 'produtos', chave: 'CARTAO', rotulo: 'Cartão de Crédito' });

      expect(componente.formulario.get('produtos')?.value).toEqual(['SEGUROS']);
    });

    it('remover o chip de recorte emite a limpeza do período', () => {
      componente.filtros = { ...FILTROS, periodo: '2026-03' };
      const emitido: unknown[] = [];
      componente.filtrosAlterados.subscribe((v) => emitido.push(v));

      componente.removerChip({ tipo: 'recorte', chave: '2026-03', rotulo: 'mar/26' });

      expect(emitido).toEqual([{ periodo: null }]);
    });
  });

  describe('botão "Limpar filtros"', () => {
    it('some quando nada difere do padrão', () => {
      componente.filtros = { ...FILTROS, de: filtrosPadrao().de, ate: filtrosPadrao().ate };

      expect(componente.podeLimpar).toBeFalse();
    });

    it('aparece com filtro de dimensão', () => {
      componente.filtros = { ...FILTROS, ...filtrosPadrao(), produtos: ['CARTAO'] };

      expect(componente.podeLimpar).toBeTrue();
    });

    it('aparece quando só a janela de tempo mudou — o caso que antes escondia o botão', () => {
      componente.filtros = { ...filtrosPadrao(), de: '2026-02-01', ate: '2026-02-28' };

      expect(componente.podeLimpar).toBeTrue();
    });

    it('aparece com recorte vindo do gráfico', () => {
      componente.filtros = { ...filtrosPadrao(), periodo: '2026-03' };

      expect(componente.podeLimpar).toBeTrue();
    });
  });

  it('marca o campo como ativo apenas quando tem seleção', () => {
    componente.filtros = { ...FILTROS, origens: ['AGENCIA'] };

    expect(componente.temSelecao('origens')).toBeTrue();
    expect(componente.temSelecao('produtos')).toBeFalse();
  });
});
