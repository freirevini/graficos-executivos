import { ModeloIaDto } from '../../models/inicio.dto';
import { DialogoModeloLlmComponent } from './dialogo-modelo-llm.component';

function modelo(sobrepor: Partial<ModeloIaDto> = {}): ModeloIaDto {
  return {
    chave: 'GEMINI_38FLASH',
    rotulo: 'Gemini 3.8 Flash',
    papel: 'Processamento rápido e triagem secundária',
    participacaoPercentual: 3.5,
    versao: '3.8-flash',
    dataLancamento: '09/2024',
    logo: 'gemini',
    ...sobrepor,
  };
}

describe('DialogoModeloLlmComponent', () => {
  it('casa cada modelo com seu benchmark pela chave', () => {
    const componente = new DialogoModeloLlmComponent({ modelos: [modelo()] });

    expect(componente.modelos.length).toBe(1);
    expect(componente.modelos[0].benchmark?.intelligenceIndex).toBe(41);
  });

  it('achata para null quando o benchmark existe mas não tem nenhuma métrica publicada (preview)', () => {
    const componente = new DialogoModeloLlmComponent({
      modelos: [modelo({ chave: 'GEMINI_31PRO', rotulo: 'Gemini 3.1 Pro' })],
    });

    expect(componente.modelos[0].benchmark).toBeNull();
  });

  it('não derruba quando o modelo não tem benchmark conhecido', () => {
    const componente = new DialogoModeloLlmComponent({
      modelos: [modelo({ chave: 'DESCONHECIDO' })],
    });

    expect(componente.modelos[0].benchmark).toBeNull();
  });

  it('expõe a URL do benchmark completo', () => {
    const componente = new DialogoModeloLlmComponent({ modelos: [] });
    expect(componente.urlBenchmark).toContain('artificialanalysis.ai');
  });
});
