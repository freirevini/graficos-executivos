import { formatarTempo } from './formatar-tempo';

describe('formatarTempo', () => {
  it('formata segundos abaixo de um minuto', () => {
    expect(formatarTempo(32)).toBe('32s');
  });

  it('formata exatamente um minuto sem segundos residuais', () => {
    expect(formatarTempo(60)).toBe('1min');
  });

  it('formata minutos com segundos residuais', () => {
    expect(formatarTempo(303)).toBe('5min 3s');
  });
});
