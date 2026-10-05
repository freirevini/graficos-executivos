import { ConfiguracaoProjetoDto } from '../models/inicio.dto';

/**
 * Contrato do mock gerado por `tools/gerar-mocks.js`: se o gerador perder um
 * campo do DTO (ou os modelos usados pelos benchmarks), a Home degrada em
 * silêncio — o tile "Modelo LLM" chegou a ficar sem ação por isso.
 */
describe('configuracao.mock.json (contrato com ConfiguracaoProjetoDto)', () => {
  let configuracao: ConfiguracaoProjetoDto;

  beforeAll(async () => {
    configuracao = await (await fetch('/assets/mocks/inicio/configuracao.mock.json')).json();
  });

  it('traz versão, lançamento e logo em todos os modelos', () => {
    expect(configuracao.modelos.length).toBeGreaterThan(0);
    configuracao.modelos.forEach((m) => {
      expect(m.versao).withContext(m.chave).toBeTruthy();
      expect(m.dataLancamento).withContext(m.chave).toMatch(/^\d{2}\/\d{4}$/);
      expect(m.logo).withContext(m.chave).toBeTruthy();
    });
  });

  it('inclui os modelos Gemini casados com os benchmarks', () => {
    const chaves = configuracao.modelos.filter((m) => m.logo === 'gemini').map((m) => m.chave);
    expect(chaves).toEqual(jasmine.arrayContaining(['GEMINI_31PRO', 'GEMINI_38FLASH']));
  });

  it('preenche os campos de topo do DTO', () => {
    expect(configuracao.versaoPrompt).toBeTruthy();
    expect(configuracao.tempoMedioSegundos).toBeGreaterThan(0);
    expect(configuracao.janelaDados.de).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(configuracao.atualizadoEm).toBeTruthy();
  });
});
