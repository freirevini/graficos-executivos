import { ultimosDias } from './periodo-recente';

describe('ultimosDias', () => {
  it('calcula uma janela de N dias terminando hoje, inclusive', () => {
    const hoje = new Date(2026, 8, 15); // 15/09/2026
    const resultado = ultimosDias(30, hoje);

    expect(resultado.ate).toBe('2026-09-15');
    expect(resultado.de).toBe('2026-08-17'); // 30 dias inclusive: 15/09 - 29 = 17/08
    expect(resultado.granularidade).toBe('dia');
  });

  it('atravessa a virada de ano corretamente', () => {
    const hoje = new Date(2026, 0, 5); // 05/01/2026
    const resultado = ultimosDias(30, hoje);

    expect(resultado.ate).toBe('2026-01-05');
    expect(resultado.de).toBe('2025-12-07');
  });
});
