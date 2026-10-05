import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { formatarTempo } from '../../models/formatar-tempo';
import { ConfiguracaoProjetoDto, ModeloIaDto } from '../../models/inicio.dto';
import { DialogoModeloLlmComponent, DadosDialogoModeloLlm } from '../dialogo-modelo-llm/dialogo-modelo-llm.component';

export interface DadosDialogoConfiguracao {
  configuracao: ConfiguracaoProjetoDto;
}

interface DefinicaoAgente {
  titulo: string;
  /** Chave do modelo em `ConfiguracaoProjetoDto.modelos` que executa o agente. */
  chave: string;
  funcao: string;
  entrega: string;
}

export interface AgentePipeline extends DefinicaoAgente {
  ordem: number;
  /** `null` quando o BFF não devolveu o modelo do agente. */
  modelo: ModeloIaDto | null;
}

/**
 * Como a IA foi configurada no projeto: técnica RAG sobre as regras de
 * compliance e de negócio, executada por 2 agentes em sequência. O texto é
 * institucional (não vem do BFF); do BFF vêm só os modelos, a versão do prompt
 * e a janela de dados.
 */
const AGENTES: readonly DefinicaoAgente[] = [
  {
    titulo: 'Agente de triagem',
    chave: 'GEMINI_38FLASH',
    funcao: 'Entende somente o contexto da peça e cria as informações de que o próximo agente precisa. Não avalia a peça.',
    entrega: 'Contexto da peça, pronto para a avaliação',
  },
  {
    titulo: 'Agente avaliador',
    chave: 'GEMINI_31PRO',
    funcao: 'Com base nas informações da triagem, aplica as regras de compliance e de negócio e o RAG à peça avaliada.',
    entrega: 'Resultado estruturado: status, parecer e recomendações de ajuste',
  },
];

@Component({
  selector: 'ini-dialogo-configuracao',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialogo-configuracao.component.html',
  styleUrls: ['./dialogo-configuracao.component.scss'],
})
export class DialogoConfiguracaoComponent {
  readonly configuracao: ConfiguracaoProjetoDto;
  readonly agentes: AgentePipeline[];
  readonly temGemini: boolean;

  readonly formatarTempo = formatarTempo;

  constructor(
    @Inject(MAT_DIALOG_DATA) dados: DadosDialogoConfiguracao,
    private readonly dialogo: MatDialog,
  ) {
    this.configuracao = dados.configuracao;
    this.agentes = AGENTES.map((agente, i) => ({
      ...agente,
      ordem: i + 1,
      modelo: dados.configuracao.modelos.find((m) => m.chave === agente.chave) ?? null,
    }));
    this.temGemini = dados.configuracao.modelos.some((m) => m.logo === 'gemini');
  }

  /** Ficha e benchmark independente dos modelos Gemini do pipeline. */
  abrirFichaGemini(): void {
    const modelos = this.configuracao.modelos.filter((m) => m.logo === 'gemini');
    this.dialogo.open<DialogoModeloLlmComponent, DadosDialogoModeloLlm>(DialogoModeloLlmComponent, {
      data: { modelos },
      width: 'min(480px, 92vw)',
      maxHeight: '86vh',
      autoFocus: 'dialog',
      restoreFocus: true,
      ariaLabel: 'Modelos Gemini em uso no pipeline',
    });
  }
}
