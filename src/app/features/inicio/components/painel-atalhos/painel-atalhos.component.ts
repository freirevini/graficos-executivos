import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NgFor } from '@angular/common';

/** Atalho de navegação para uma função real do sistema, com o recorte já pronto. */
export interface AtalhoInicio {
  id: string;
  rotulo: string;
  descricao: string;
  icone: string;
  rota: string[];
  queryParams?: Params;
}

/**
 * Painel de atalhos da Home (dumb): tiles que navegam de verdade, com os
 * query params do recorte prometido no rótulo (ex.: "Últimos 30 dias").
 */
@Component({
    selector: 'ini-painel-atalhos',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './painel-atalhos.component.html',
    styleUrls: ['./painel-atalhos.component.scss'],
    standalone: true,
    imports: [NgFor, RouterLink, MatIconModule]
})
export class PainelAtalhosComponent {
  @Input() atalhos: AtalhoInicio[] = [];
}
