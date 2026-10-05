import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ModeloIaDto } from '../../models/inicio.dto';

export interface EtapaPipeline {
  titulo: string;
  descricao: string;
}

export const ETAPAS_PIPELINE: readonly EtapaPipeline[] = [
  {
    titulo: 'Envio da peça',
    descricao: 'Você envia a peça de comunicação, antes da veiculação, para ser avaliada.',
  },
  {
    titulo: 'Análise de conformidade',
    descricao: 'A peça passa pelos agentes de IA: a triagem entende o contexto e o avaliador aplica as regras de compliance e de negócio, com apoio do RAG.',
  },
  {
    titulo: 'Parecer',
    descricao: 'Resultado aprovado ou reprovado, com os riscos identificados na peça e sugestões de ajuste.',
  },
];

// PONTO DE INTEGRAÇÃO (D9): lista genérica; Compliance valida o texto e a lista final.
export const REFERENCIAS_NORMATIVAS: readonly string[] = ['CMN', 'SUSEP', 'FEBRABAN', 'Políticas internas'];

/**
 * "Como funciona" (dumb): as 3 etapas do processo (envio, análise e parecer) numa
 * lista ordenada, as referências normativas e os modelos em operação. O texto institucional longo
 * entra por projeção de conteúdo, dentro de um `<details>` recolhido.
 */
@Component({
  selector: 'ini-como-funciona',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './como-funciona.component.html',
  styleUrls: ['./como-funciona.component.scss'],
})
export class ComoFuncionaComponent {
  @Input() modelos: ModeloIaDto[] = [];

  readonly etapas = ETAPAS_PIPELINE;
  readonly referencias = REFERENCIAS_NORMATIVAS;
}
