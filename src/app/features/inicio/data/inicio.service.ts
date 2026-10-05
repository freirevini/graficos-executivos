import { Observable } from 'rxjs';
import { ResumoInicioDto, UltimaAnaliseDto } from '../models/inicio.dto';

/**
 * Contrato da camada de dados da Home.
 *
 * Classe abstrata (e não interface) para servir de token de DI sem
 * `InjectionToken` extra — mesmo padrão de `GraficosExecutivosService`. Qual
 * implementação responde (HTTP real ou mock) é decidido em `inicio.routes.ts` a
 * partir de `environment.usarMock`.
 */
export abstract class InicioService {
  /** Envelope agregado: uso do ano, série mensal e configuração vigente. */
  abstract carregarResumo(): Observable<ResumoInicioDto>;

  /** As `limite` peças avaliadas mais recentes, da mais nova para a mais antiga. */
  abstract carregarUltimasAnalises(limite: number): Observable<UltimaAnaliseDto[]>;
}
