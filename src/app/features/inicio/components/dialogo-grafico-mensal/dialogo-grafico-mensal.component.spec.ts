import { LeitorPaletaService } from '../../../../core/services/leitor-paleta.service';
import { competenciaDe } from '../../models/competencia';
import { PontoMensalInicioDto } from '../../models/inicio.dto';
import { DialogoGraficoMensalComponent } from './dialogo-grafico-mensal.component';

function pontos(): PontoMensalInicioDto[] {
  return [
    { competencia: '2026-08', rotulo: 'ago/26', total: 50, aprovadas: 45, reprovadas: 5, tempoMedioSegundos: 30 },
    { competencia: '2026-09', rotulo: 'set/26', total: 60, aprovadas: 55, reprovadas: 5, tempoMedioSegundos: 34 },
  ];
}

function paletaFalsa(): LeitorPaletaService {
  return {
    token: () => '#1976d2',
    serieCategorica: () => ['#1976d2'],
    acao: '#1976d2',
    grade: '#eceff1',
    eixoTexto: '#666666',
    tooltipFundo: '#212121',
  } as unknown as LeitorPaletaService;
}

describe('DialogoGraficoMensalComponent', () => {
  it('monta labels e valores da métrica "total"', () => {
    const componente = new DialogoGraficoMensalComponent(
      { titulo: 'Análises em 2026', pontos: pontos(), metrica: 'total' },
      paletaFalsa(),
    );

    expect(componente.dados.labels).toEqual(['ago/26', 'set/26']);
    expect(componente.dados.datasets[0].data).toEqual([50, 60]);
    expect(componente.temDados).toBeTrue();
  });

  it('monta valores da métrica "tempoMedioSegundos"', () => {
    const componente = new DialogoGraficoMensalComponent(
      { titulo: 'Tempo médio para análise', pontos: pontos(), metrica: 'tempoMedioSegundos' },
      paletaFalsa(),
    );

    expect(componente.dados.datasets[0].data).toEqual([30, 34]);
  });

  it('marca ausência de dados quando todos os pontos são zero', () => {
    const vazios: PontoMensalInicioDto[] = [
      { competencia: '2026-09', rotulo: 'set/26', total: 0, aprovadas: 0, reprovadas: 0, tempoMedioSegundos: 0 },
    ];
    const componente = new DialogoGraficoMensalComponent(
      { titulo: 'Análises em 2026', pontos: vazios, metrica: 'total' },
      paletaFalsa(),
    );

    expect(componente.temDados).toBeFalse();
  });

  it('expõe descrição e tabela alternativa e marca o mês corrente como parcial', () => {
    const corrente = competenciaDe(new Date());
    const parcial: PontoMensalInicioDto[] = [
      ...pontos(),
      { competencia: corrente, rotulo: 'mes/atual', total: 7, aprovadas: 5, reprovadas: 2, tempoMedioSegundos: 31 },
    ];
    const componente = new DialogoGraficoMensalComponent(
      { titulo: 'Análises em 2026', pontos: parcial, metrica: 'total' },
      paletaFalsa(),
    );

    expect(componente.linhas.map((l) => l.rotulo)).toEqual(['ago/26', 'set/26', 'mes/atual (parcial)']);
    expect(componente.linhas[2].valor).toBe('7 peças');
    expect(componente.descricao).toContain('mes/atual (parcial) 7 peças');
  });
});
