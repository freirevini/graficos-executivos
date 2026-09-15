import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Única fonte de verdade para montagem de URLs do BFF.
 *
 * PONTO DE INTEGRAÇÃO: se o projeto real já possuir um helper equivalente
 * (ou se o chassi injetar a base via APP_INITIALIZER), troque esta classe por
 * ele — os services de feature dependem apenas do método `graficosExecutivos()`.
 */
@Injectable({ providedIn: 'root' })
export class ApiUrlService {
  /** Ex.: `/api/graficos-executivos` ou `/api/graficos-executivos/analitico`. */
  graficosExecutivos(sufixo = ''): string {
    return `${environment.api.baseUrl}${environment.api.graficosExecutivos}${sufixo}`;
  }
}
