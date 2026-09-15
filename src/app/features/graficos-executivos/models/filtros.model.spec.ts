import {
  FiltrosGraficos,
  deQueryParams,
  filtrosIguais,
  filtrosPadrao,
  granularidadeDoPreset,
  paraQueryParams,
  periodoDoPreset,
  presetAtivo,
} from './filtros.model';

describe('filtros.model', () => {
  const hoje = new Date('2026-09-14T12:00:00');

  describe('periodoDoPreset', () => {
    it('monta os últimos 30 dias incluindo hoje', () => {
      expect(periodoDoPreset('30d', hoje)).toEqual({ de: '2026-08-16', ate: '2026-09-14' });
    });

    it('monta o ano atual a partir de 1º de janeiro', () => {
      expect(periodoDoPreset('ano', hoje)).toEqual({ de: '2026-01-01', ate: '2026-09-14' });
    });

    it('monta os últimos 3 meses a partir do dia 1 da competência inicial', () => {
      expect(periodoDoPreset('3m', hoje)).toEqual({ de: '2026-07-01', ate: '2026-09-14' });
    });

    it('associa a granularidade certa a cada preset', () => {
      expect(granularidadeDoPreset('30d')).toBe('dia');
      expect(granularidadeDoPreset('3m')).toBe('mes');
      expect(granularidadeDoPreset('ano')).toBe('mes');
    });
  });

  describe('serialização para a URL', () => {
    it('omite listas vazias, recorte nulo e a granularidade padrão', () => {
      expect(paraQueryParams(filtrosPadrao(hoje))).toEqual({ de: '2026-01-01', ate: '2026-09-14' });
    });

    it('serializa a granularidade só quando é diária', () => {
      const base = filtrosPadrao(hoje);
      expect(paraQueryParams({ ...base, granularidade: 'dia' })['granularidade']).toBe('dia');
    });

    it('serializa listas como CSV', () => {
      const params = paraQueryParams({
        de: '2026-01-01',
        ate: '2026-09-14',
        granularidade: 'mes',
        produtos: ['CARTAO', 'SEGUROS'],
        origens: ['DIGITAL'],
        riscos: [],
        periodo: '2026-08',
      });

      expect(params).toEqual({
        de: '2026-01-01',
        ate: '2026-09-14',
        produto: 'CARTAO,SEGUROS',
        origem: 'DIGITAL',
        periodo: '2026-08',
      });
    });

    it('faz a volta completa sem perder informação', () => {
      const original: FiltrosGraficos = {
        de: '2026-03-01',
        ate: '2026-06-30',
        granularidade: 'mes',
        produtos: ['CARTAO'],
        origens: ['PARCEIRO', 'DIGITAL'],
        riscos: ['ALTO'],
        periodo: '2026-05',
      };

      expect(deQueryParams(paraQueryParams(original), hoje)).toEqual(original);
    });
  });

  describe('deQueryParams', () => {
    it('cai no padrão quando a data da URL é inválida', () => {
      const resultado = deQueryParams({ de: 'ontem', ate: '2026-09-14' }, hoje);
      expect(resultado.de).toBe('2026-01-01');
      expect(resultado.ate).toBe('2026-09-14');
    });

    it('descarta um recorte com formato inesperado em vez de propagá-lo', () => {
      expect(deQueryParams({ periodo: 'ontem' }, hoje).periodo).toBeNull();
    });

    it('descarta recorte de dia numa visão mensal (URL editada à mão)', () => {
      expect(deQueryParams({ periodo: '2026-08-12' }, hoje).periodo).toBeNull();
    });

    it('aceita recorte de dia quando a granularidade é diária', () => {
      const resultado = deQueryParams({ granularidade: 'dia', periodo: '2026-08-12' }, hoje);
      expect(resultado.periodo).toBe('2026-08-12');
      expect(resultado.granularidade).toBe('dia');
    });

    it('ignora entradas vazias dentro do CSV', () => {
      expect(deQueryParams({ produto: 'CARTAO,,SEGUROS,' }, hoje).produtos)
        .toEqual(['CARTAO', 'SEGUROS']);
    });
  });

  describe('filtrosIguais', () => {
    it('detecta mudança apenas no recorte do cross-filter', () => {
      const base = filtrosPadrao(hoje);
      expect(filtrosIguais(base, { ...base, periodo: '2026-08' })).toBeFalse();
    });

    it('detecta mudança apenas na granularidade', () => {
      const base = filtrosPadrao(hoje);
      expect(filtrosIguais(base, { ...base, granularidade: 'dia' })).toBeFalse();
    });

    it('considera a ordem das listas', () => {
      const base = { ...filtrosPadrao(hoje), produtos: ['A', 'B'] };
      expect(filtrosIguais(base, { ...base, produtos: ['B', 'A'] })).toBeFalse();
    });
  });


  describe('presetAtivo', () => {
    it('reconhece o preset padrão', () => {
      expect(presetAtivo(filtrosPadrao(hoje), hoje)).toBe('ano');
    });

    it('não marca nenhum preset num range customizado', () => {
      const custom = { ...filtrosPadrao(hoje), de: '2026-04-11', ate: '2026-05-02' };
      expect(presetAtivo(custom, hoje)).toBeNull();
    });

    it('distingue presets que compartilham a janela mas não a granularidade', () => {
      const comoDia = { ...filtrosPadrao(hoje), granularidade: 'dia' as const };
      expect(presetAtivo(comoDia, hoje)).toBeNull();
    });
  });
});
