import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ChartConfiguration, ChartData } from 'chart.js';
import { LeitorPaletaService } from '../../../../core/services/leitor-paleta.service';
import { competenciaDe } from '../../models/competencia';
import { formatarTempo } from '../../models/formatar-tempo';
import { PontoMensalInicioDto } from '../../models/inicio.dto';
import { MatButtonModule } from '@angular/material/button';
import { NgChartsModule } from 'ng2-charts';
import { NgIf, NgFor } from '@angular/common';

/** Métrica plotada — cada uma já vem pronta na série mensal do resumo. */
export type MetricaGraficoMensal = 'total' | 'tempoMedioSegundos';

export interface DadosDialogoGraficoMensal {
  titulo: string;
  pontos: PontoMensalInicioDto[];
  metrica: MetricaGraficoMensal;
}

/**
 * Gráfico de barras mês a mês (dumb): abre a partir de "Análises em {ano}" e
 * "Tempo médio para análise" — mesma série mensal do resumo, só troca a
 * métrica plotada. Sem cross-filter nem recorte: é um resumo visual, os
 * atalhos de navegação de verdade ficam nos Gráficos Executivos.
 */
@Component({
    selector: 'ini-dialogo-grafico-mensal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dialogo-grafico-mensal.component.html',
    styleUrls: ['./dialogo-grafico-mensal.component.scss'],
    standalone: true,
    imports: [MatDialogModule, NgIf, NgChartsModule, NgFor, MatButtonModule]
})
export class DialogoGraficoMensalComponent {
  readonly titulo: string;
  readonly temDados: boolean;
  /** Texto equivalente do gráfico para leitor de tela. */
  readonly descricao: string;
  /** Alternativa tabular do gráfico (mesmos dados, em texto). */
  readonly linhas: { rotulo: string; valor: string }[];

  dados: ChartData<'bar', number[], string> = { labels: [], datasets: [] };
  opcoes: ChartConfiguration<'bar'>['options'];

  constructor(
    @Inject(MAT_DIALOG_DATA) { titulo, pontos, metrica }: DadosDialogoGraficoMensal,
    private readonly paleta: LeitorPaletaService,
  ) {
    this.titulo = titulo;
    this.temDados = pontos.some((p) => p[metrica] > 0);

    const ehTempo = metrica === 'tempoMedioSegundos';
    const valores = pontos.map((p) => p[metrica]);
    const competenciaAtual = competenciaDe(new Date());
    const rotulos = pontos.map((p) => (p.competencia === competenciaAtual ? `${p.rotulo} (parcial)` : p.rotulo));
    const formatar = (valor: number) => (ehTempo ? formatarTempo(valor) : `${valor} peças`);
    this.linhas = pontos.map((p, i) => ({ rotulo: rotulos[i], valor: formatar(p[metrica]) }));
    this.descricao = `${titulo}, mês a mês: ${this.linhas.map((l) => `${l.rotulo} ${l.valor}`).join('; ')}.`;

    this.dados = {
      labels: rotulos,
      datasets: [
        {
          data: valores,
          backgroundColor: this.paleta.acao,
          borderRadius: 4,
          maxBarThickness: 40,
        },
      ],
    };

    this.opcoes = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: this.paleta.tooltipFundo,
          callbacks: {
            label: (contexto) => {
              const valor = contexto.parsed.y;
              return ehTempo ? ` ${formatarTempo(valor)}` : ` ${valor} peças`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: this.paleta.eixoTexto },
        },
        y: {
          beginAtZero: true,
          grid: { color: this.paleta.grade },
          ticks: {
            color: this.paleta.eixoTexto,
            callback: (valor) => (ehTempo ? formatarTempo(Number(valor)) : valor),
          },
        },
      },
    };
  }
}
