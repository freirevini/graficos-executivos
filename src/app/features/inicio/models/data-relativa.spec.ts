import { dataRelativa } from './data-relativa';

describe('dataRelativa', () => {
  const agora = new Date(2026, 9, 5, 15, 0);

  it('minutos e horas no mesmo dia', () => {
    expect(dataRelativa('2026-10-05T14:57:00', agora)).toBe('há 3 min');
    expect(dataRelativa('2026-10-05T14:59:50', agora)).toBe('há 1 min');
    expect(dataRelativa('2026-10-05T12:30:00', agora)).toBe('há 2 h');
  });

  it('ontem com hora', () => {
    expect(dataRelativa('2026-10-04T16:40:00', agora)).toBe('ontem, 16:40');
  });

  it('dias anteriores em dd/MM, HH:mm', () => {
    expect(dataRelativa('2026-10-03T09:15:00', agora)).toBe('03/10, 09:15');
  });

  it('data no futuro (relógio adiantado) não vira "há -N"', () => {
    expect(dataRelativa('2026-10-05T15:10:00', agora)).toBe('05/10, 15:10');
  });
});
