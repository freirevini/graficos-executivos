import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { BenchmarkModelo, URL_BENCHMARK_ARTIFICIAL_ANALYSIS, benchmarkDoModelo } from '../../models/benchmark-gemini';
import { ModeloIaDto } from '../../models/inicio.dto';
import { MatButtonModule } from '@angular/material/button';
import { NgFor, NgIf, DecimalPipe, CurrencyPipe } from '@angular/common';

export interface DadosDialogoModeloLlm {
  modelos: ModeloIaDto[];
}

/** Um modelo Gemini já casado com seu benchmark (quando existe um publicado). */
export interface ModeloComBenchmark {
  modelo: ModeloIaDto;
  benchmark: BenchmarkModelo | null;
}

/**
 * Ficha minimalista do provedor Gemini (dumb): abre a partir do tile
 * "Modelo LLM e versão" — mostra só os modelos Gemini do pipeline (o
 * `painel-atalhos` já não distingue por provedor, então o recorte é feito
 * aqui) e o benchmark independente da Artificial Analysis, quando publicado.
 */
@Component({
    selector: 'ini-dialogo-modelo-llm',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dialogo-modelo-llm.component.html',
    styleUrls: ['./dialogo-modelo-llm.component.scss'],
    standalone: true,
    imports: [MatDialogModule, NgFor, NgIf, MatButtonModule, DecimalPipe, CurrencyPipe]
})
export class DialogoModeloLlmComponent {
  readonly urlBenchmark = URL_BENCHMARK_ARTIFICIAL_ANALYSIS;
  readonly modelos: ModeloComBenchmark[];

  constructor(@Inject(MAT_DIALOG_DATA) { modelos }: DadosDialogoModeloLlm) {
    this.modelos = modelos.map((modelo) => {
      const benchmark = benchmarkDoModelo(modelo.chave);
      // Um benchmark "publicado, mas com os 3 campos nulos" (preview ainda
      // sem avaliação) deve cair no mesmo fallback de "sem benchmark" —
      // achatar aqui evita repetir essa checagem nos três `*ngIf` do template.
      const temAlgumaMetrica = !!benchmark && (
        benchmark.intelligenceIndex !== null
        || benchmark.velocidadeTokensPorSegundo !== null
        || benchmark.custoPorTarefaUsd !== null
      );
      return { modelo, benchmark: temAlgumaMetrica ? benchmark : null };
    });
  }
}
