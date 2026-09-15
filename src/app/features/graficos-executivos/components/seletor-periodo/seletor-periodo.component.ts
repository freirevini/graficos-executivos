import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import {
  FiltrosGraficos,
  OpcaoPreset,
  PRESETS_PERIODO,
  PresetPeriodo,
  periodoDoPreset,
  presetAtivo,
} from '../../models/filtros.model';

/** Payload emitido ao trocar a janela de tempo. */
export interface PeriodoEscolhido {
  de: string;
  ate: string;
  granularidade: OpcaoPreset['granularidade'];
}

/**
 * Seletor segmentado de período, no canto superior direito do card do gráfico
 * de correlação.
 *
 * Além da janela de tempo, cada opção carrega a granularidade da série: 30 dias
 * é lido em dias, 3 meses e ano atual em competências.
 *
 * O date-range livre da barra de filtros continua existindo; quando o recorte
 * não corresponde a nenhum preset, nenhum botão fica marcado (estado
 * "personalizado"), em vez de marcar um botão errado.
 */
@Component({
  selector: 'gx-seletor-periodo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seletor-periodo.component.html',
  styleUrls: ['./seletor-periodo.component.scss'],
})
export class SeletorPeriodoComponent {
  @Input() filtros: FiltrosGraficos | null = null;
  @Output() periodoEscolhido = new EventEmitter<PeriodoEscolhido>();

  readonly presets = PRESETS_PERIODO;

  get ativo(): PresetPeriodo | null {
    return this.filtros ? presetAtivo(this.filtros) : null;
  }

  escolher(preset: OpcaoPreset): void {
    const { de, ate } = periodoDoPreset(preset.valor);
    this.periodoEscolhido.emit({ de, ate, granularidade: preset.granularidade });
  }
}
