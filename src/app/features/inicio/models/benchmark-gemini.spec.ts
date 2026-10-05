import { benchmarkDoModelo } from './benchmark-gemini';

describe('benchmarkDoModelo', () => {
  it('retorna o benchmark do Gemini 3.8 Flash', () => {
    const benchmark = benchmarkDoModelo('GEMINI_38FLASH');
    expect(benchmark?.intelligenceIndex).toBe(41);
    expect(benchmark?.velocidadeTokensPorSegundo).toBe(336);
  });

  it('retorna benchmark com campos nulos para o Gemini 3.1 Pro (preview, sem avaliação publicada)', () => {
    const benchmark = benchmarkDoModelo('GEMINI_31PRO');
    expect(benchmark?.intelligenceIndex).toBeNull();
  });

  it('retorna null para uma chave sem benchmark conhecido', () => {
    expect(benchmarkDoModelo('GPT4O_TRIAGEM')).toBeNull();
  });
});
