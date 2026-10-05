import { ResumoInicioDto } from './inicio.dto';
import { montarKpis } from './kpis-inicio';

function ponto(competencia: string, rotulo: string, total: number, aprovadas: number, tempo: number) {
  return { competencia, rotulo, total, aprovadas, reprovadas: total - aprovadas, tempoMedioSegundos: tempo };
}

function resumo(serieMensal: ResumoInicioDto['serieMensal']): ResumoInicioDto {
  return {
    geradoEm: '',
    ano: 2026,
    uso: {
      pecasAnalisadas: 100, pecasAprovadas: 70, pecasReprovadas: 30, percentualConformidade: 70,
      tempoMedioSegundos: 33, pecasMesCorrente: 0, pecasMesAnterior: 0, desde: '2024-08-01',
    },
    serieMensal,
    configuracao: { modelos: [], tempoMedioSegundos: 32, versaoPrompt: 'v1', janelaDados: { de: '', ate: '' }, atualizadoEm: '' },
  };
}

const HOJE = new Date(2026, 9, 5); // out/2026

describe('montarKpis', () => {
  const serie = [
    ponto('2026-07', 'jul/26', 40, 28, 30),
    ponto('2026-08', 'ago/26', 50, 36, 32),
    ponto('2026-09', 'set/26', 60, 42, 34),
    ponto('2026-10', 'out/26', 7, 5, 31),
  ];

  it('exclui o mês corrente (parcial) da série e compara os dois últimos fechados', () => {
    const k = montarKpis(resumo(serie), HOJE);

    expect(k.analises.serie).toEqual([40, 50, 60]);
    expect(k.analises.variacao).toEqual({ valor: 20, unidade: '%' });
    expect(k.analises.comparativo).toBe('set/26 vs. ago/26');
  });

  it('conformidade em p.p. e tempo médio em segundos', () => {
    const k = montarKpis(resumo(serie), HOJE);

    expect(k.conformidade.variacao).toEqual({ valor: -2, unidade: 'p.p.' });
    expect(k.tempoMedio.variacao).toEqual({ valor: 2, unidade: 's' });
    expect(k.conformidade.valor).toBe(70);
    expect(k.tempoMedio.valor).toBe(33);
  });

  it('sem dois meses fechados (janeiro) não há variação nem comparativo', () => {
    const k = montarKpis(resumo([ponto('2026-01', 'jan/26', 5, 4, 30)]), new Date(2026, 0, 20));

    expect(k.analises.serie).toEqual([]);
    expect(k.analises.variacao).toBeNull();
    expect(k.conformidade.variacao).toBeNull();
    expect(k.analises.comparativo).toBe('');
  });

  it('mês anterior zerado não gera variação infinita', () => {
    const k = montarKpis(resumo([ponto('2026-08', 'ago/26', 0, 0, 0), ponto('2026-09', 'set/26', 10, 8, 30)]), HOJE);

    expect(k.analises.variacao).toBeNull();
    expect(k.conformidade.variacao).toBeNull();
    expect(k.tempoMedio.serie).toEqual([30]);
  });
});
