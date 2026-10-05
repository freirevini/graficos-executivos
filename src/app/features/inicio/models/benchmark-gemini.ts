/**
 * Benchmark independente dos modelos Gemini — Artificial Analysis
 * (https://artificialanalysis.ai), consultado em 15/09/2026.
 *
 * Dado de TERCEIRO, não do BFF do ConforME: por isso vive fora de
 * `inicio.dto.ts` (contrato do backend) como uma constante local, casada por
 * `chave` com o `ModeloIaDto` vindo do resumo. Se o site atualizar os números
 * ou trocar a metodologia (ex.: "Intelligence Index" mudar de versão), só
 * este arquivo muda.
 */

export interface BenchmarkModelo {
  chave: string;
  /** Artificial Analysis Intelligence Index — maior é melhor. */
  intelligenceIndex: number | null;
  /** Tokens de saída por segundo — maior é melhor. */
  velocidadeTokensPorSegundo: number | null;
  /** Custo médio ponderado (USD) por tarefa do índice — menor é melhor. */
  custoPorTarefaUsd: number | null;
}

export const URL_BENCHMARK_ARTIFICIAL_ANALYSIS =
  'https://artificialanalysis.ai/?models=claude-opus-5%2Cgpt-6-astra%2Cgpt-5-6-luna%2Cglm-5-3%2Cgemini-3-8-flash%2Cgemini-3-1-pro-preview%2Cdeepseek-v4-1-flash%2Cnvidia-nemotron-3-ultra-550b-a55b%2Cglm-5-2-non-reasoning%2Cmimo-v2-5-pro';

/**
 * `GEMINI_31PRO` ainda não tem avaliação pública no site (modelo em
 * preview) — os três campos ficam `null` e a tela mostra "ainda sem
 * benchmark publicado" em vez de um número inventado.
 */
export const BENCHMARKS_GEMINI: readonly BenchmarkModelo[] = [
  { chave: 'GEMINI_38FLASH', intelligenceIndex: 41, velocidadeTokensPorSegundo: 336, custoPorTarefaUsd: 1.24 },
  { chave: 'GEMINI_31PRO', intelligenceIndex: null, velocidadeTokensPorSegundo: null, custoPorTarefaUsd: null },
];

export function benchmarkDoModelo(chave: string): BenchmarkModelo | null {
  return BENCHMARKS_GEMINI.find((b) => b.chave === chave) ?? null;
}
