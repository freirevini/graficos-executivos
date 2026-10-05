import { TestBed } from '@angular/core/testing';
import { LeitorPaletaService } from './leitor-paleta.service';

describe('LeitorPaletaService', () => {
  it('lê o token da raiz do documento', () => {
    document.documentElement.style.setProperty('--teste-cor', '#123456');
    expect(TestBed.inject(LeitorPaletaService).token('--teste-cor', '#000000')).toBe('#123456');
    document.documentElement.style.removeProperty('--teste-cor');
  });

  it('usa a reserva quando o token não existe', () => {
    expect(TestBed.inject(LeitorPaletaService).token('--nao-existe', '#abcdef')).toBe('#abcdef');
  });

  it('reservas das séries de resultado coincidem com os tokens da paleta', () => {
    const estilo = getComputedStyle(document.documentElement);
    const servico = TestBed.inject(LeitorPaletaService);
    const reservas = { '--grf-aprovadas': '#3f5fc9', '--grf-reprovadas': '#cc6363', '--grf-linha-percentual': '#c9a13c' };
    Object.entries(reservas).forEach(([token, reserva]) => {
      expect(estilo.getPropertyValue(token).trim()).toBe(reserva);
    });
    expect(servico.aprovada).toBe(reservas['--grf-aprovadas']);
  });
});
