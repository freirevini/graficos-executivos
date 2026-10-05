import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfiguracaoProjetoDto } from '../../models/inicio.dto';
import { DialogoConfiguracaoComponent } from './dialogo-configuracao.component';

function configuracao(parcial: Partial<ConfiguracaoProjetoDto> = {}): ConfiguracaoProjetoDto {
  return {
    modelos: [
      { chave: 'GEMINI_38FLASH', rotulo: 'Gemini 3.8 Flash', papel: 'triagem', participacaoPercentual: 100, versao: '3.8-flash', logo: 'gemini' },
      { chave: 'GEMINI_31PRO', rotulo: 'Gemini 3.1 Pro', papel: 'avaliador', participacaoPercentual: 100, versao: '3.1-pro', logo: 'gemini' },
    ],
    tempoMedioSegundos: 44,
    versaoPrompt: 'v3.2.1',
    janelaDados: { de: '2024-09-01', ate: '2026-10-05' },
    atualizadoEm: '2026-10-05T12:00:00.000Z',
    ...parcial,
  };
}

describe('DialogoConfiguracaoComponent', () => {
  let fixture: ComponentFixture<DialogoConfiguracaoComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  function criar(config: ConfiguracaoProjetoDto): void {
    TestBed.configureTestingModule({
      imports: [DialogoConfiguracaoComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { configuracao: config } },
        { provide: LOCALE_ID, useValue: 'pt-BR' },
      ],
    });
    fixture = TestBed.createComponent(DialogoConfiguracaoComponent);
    fixture.detectChanges();
  }

  it('explica a técnica RAG com regras de compliance e de negócio', () => {
    criar(configuracao());
    const texto = el().textContent ?? '';
    expect(texto).toContain('RAG');
    expect(texto).toContain('Regras de compliance');
    expect(texto).toContain('Regras de negócio');
  });

  it('mostra os 2 agentes em ordem, cada um com seu modelo e versão', () => {
    criar(configuracao());
    const agentes = Array.from(el().querySelectorAll('.agente'));
    expect(agentes.length).toBe(2);
    expect(agentes[0].querySelector('.agente__titulo')?.textContent).toBe('Agente de triagem');
    expect(agentes[0].querySelector('.agente__modelo')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Gemini 3.8 Flash · v3.8-flash');
    expect(agentes[1].querySelector('.agente__titulo')?.textContent).toBe('Agente avaliador');
    expect(agentes[1].querySelector('.agente__modelo')?.textContent).toContain('Gemini 3.1 Pro');
  });

  it('descreve o que cada agente faz', () => {
    criar(configuracao());
    const agentes = Array.from(el().querySelectorAll('.agente')).map((a) => a.textContent ?? '');
    expect(agentes[0]).toContain('Não avalia a peça');
    expect(agentes[1]).toContain('aplica as regras de compliance e de negócio e o RAG');
    expect(agentes[1]).toContain('Resultado estruturado');
  });

  it('sem o modelo no BFF mantém o agente e omite o nome do modelo', () => {
    criar(configuracao({ modelos: [] }));
    expect(el().querySelectorAll('.agente').length).toBe(2);
    expect(el().querySelector('.agente__modelo')).toBeNull();
    expect(el().querySelector('.detalhe__ficha')).toBeNull();
  });

  it('mostra tempo médio, versão do prompt e janela de dados em pt-BR', () => {
    criar(configuracao());
    const meta = el().querySelector('.detalhe__meta')?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(meta).toContain('44s');
    expect(meta).toContain('v3.2.1');
    expect(meta).toContain('01/09/2024 – 05/10/2026');
  });

  it('botão da ficha Gemini abre o diálogo de benchmark com os dois modelos', () => {
    criar(configuracao());
    const abrir = spyOn(fixture.debugElement.injector.get(MatDialog), 'open');
    (el().querySelector('.detalhe__ficha') as HTMLButtonElement).click();

    const [, opcoes] = abrir.calls.mostRecent().args as unknown as [unknown, { data: { modelos: unknown[] } }];
    expect(opcoes.data.modelos.length).toBe(2);
  });
});
