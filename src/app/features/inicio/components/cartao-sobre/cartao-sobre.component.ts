import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * "Sobre o ConforME" (dumb, sem inputs): o que a ferramenta faz e quem a
 * mantém. Texto institucional fixo — não é dado de negócio, então não passa
 * pelo BFF nem pelo store da página.
 */
@Component({
    selector: 'ini-cartao-sobre',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './cartao-sobre.component.html',
    styleUrls: ['./cartao-sobre.component.scss'],
    standalone: true
})
export class CartaoSobreComponent {}
