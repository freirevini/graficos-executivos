import { dataPorExtenso, saudacaoPorHora } from './saudacao';

describe('saudacaoPorHora', () => {
  it('retorna "Bom dia" no limite inferior da manhã (05h)', () => {
    expect(saudacaoPorHora(5)).toBe('Bom dia');
  });

  it('retorna "Bom dia" pouco antes do meio-dia (11h)', () => {
    expect(saudacaoPorHora(11)).toBe('Bom dia');
  });

  it('retorna "Boa tarde" no limite inferior da tarde (12h)', () => {
    expect(saudacaoPorHora(12)).toBe('Boa tarde');
  });

  it('retorna "Boa tarde" pouco antes da noite (17h)', () => {
    expect(saudacaoPorHora(17)).toBe('Boa tarde');
  });

  it('retorna "Boa noite" no limite inferior da noite (18h)', () => {
    expect(saudacaoPorHora(18)).toBe('Boa noite');
  });

  it('retorna "Boa noite" na madrugada (0h e 4h)', () => {
    expect(saudacaoPorHora(0)).toBe('Boa noite');
    expect(saudacaoPorHora(4)).toBe('Boa noite');
  });
});

describe('dataPorExtenso', () => {
  it('formata dia da semana, dia e mês por extenso', () => {
    // 2026-09-15 é uma terça-feira.
    expect(dataPorExtenso(new Date(2026, 8, 15))).toBe('terça-feira, 15 de setembro');
  });

  it('formata corretamente o primeiro dia do ano', () => {
    // 2026-01-01 é uma quinta-feira.
    expect(dataPorExtenso(new Date(2026, 0, 1))).toBe('quinta-feira, 1 de janeiro');
  });
});
