import { variacaoEmPontos, variacaoEmSegundos, variacaoPercentual } from './variacao';

describe('variacao', () => {
  it('calcula variação percentual com uma casa', () => {
    expect(variacaoPercentual(54, 50)).toEqual({ valor: 8, unidade: '%' });
    expect(variacaoPercentual(45, 50)).toEqual({ valor: -10, unidade: '%' });
  });

  it('devolve null quando a base é zero', () => {
    expect(variacaoPercentual(10, 0)).toBeNull();
  });

  it('calcula pontos percentuais e segundos', () => {
    expect(variacaoEmPontos(70.7, 71.8)).toEqual({ valor: -1.1, unidade: 'p.p.' });
    expect(variacaoEmSegundos(34, 32)).toEqual({ valor: 2, unidade: 's' });
  });
});
