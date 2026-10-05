import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Recurso } from '../../../../core/models/recurso.model';
import { ChassiModule } from '../../../../shared/chassi/chassi.module';
import { dataRelativa } from '../../models/data-relativa';
import { UltimaAnaliseDto } from '../../models/inicio.dto';

interface ItemUltimaAnalise {
  dto: UltimaAnaliseDto;
  quando: string;
  aprovada: boolean;
}

/**
 * "Últimas análises" (dumb): peças recentes com status em texto + ícone (nunca
 * só cor). Não exibe o parecer da IA — só metadados —, então nenhum conteúdo de
 * LLM chega ao DOM por aqui.
 */
@Component({
  selector: 'ini-ultimas-analises',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, ChassiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ultimas-analises.component.html',
  styleUrls: ['./ultimas-analises.component.scss'],
})
export class UltimasAnalisesComponent implements OnChanges {
  @Input() recurso: Recurso<UltimaAnaliseDto[]> | null = null;
  @Input() rotaVerTodas = '/graficos-executivos';
  /** Relógio injetável para as datas relativas (testes). */
  @Input() agora: Date = new Date();
  @Output() tentarNovamente = new EventEmitter<void>();

  itens: ItemUltimaAnalise[] = [];

  ngOnChanges(): void {
    this.itens = (this.recurso?.dados ?? []).map((dto) => ({
      dto,
      quando: dataRelativa(dto.dataAvaliacao, this.agora),
      aprovada: dto.resultado === 'APROVADA',
    }));
  }

  get vazio(): boolean {
    return !!this.recurso && !this.recurso.carregando && !this.recurso.erro && this.itens.length === 0;
  }
}
