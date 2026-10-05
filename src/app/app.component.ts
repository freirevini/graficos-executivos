import { ChangeDetectionStrategy, Component } from '@angular/core';
import { environment } from '../environments/environment';

/**
 * Casca mínima da aplicação.
 *
 * PONTO DE INTEGRAÇÃO: no projeto real, a barra superior, o menu lateral e o
 * rodapé vêm do chassi (@arqt/ng15-framework). Este shell existe apenas para
 * dar contexto visual ao desenvolver a feature isoladamente — ao portar,
 * descarte-o e mantenha só o `<router-outlet>`.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly producao = environment.producao;
}
