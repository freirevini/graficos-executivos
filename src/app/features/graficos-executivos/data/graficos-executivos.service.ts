import { Observable } from 'rxjs';
import { FiltrosGraficos } from '../models/filtros.model';
import {
  DashboardGraficosDto,
  LinhaAnaliticoDto,
  OpcoesFiltroDto,
  PaginaDto,
  ParametrosPagina,
} from '../models/graficos-executivos.dto';

/**
 * Contrato da camada de dados da feature.
 *
 * É uma classe abstrata (e não uma interface) para servir como token de DI sem
 * `InjectionToken` extra. O container injeta SEMPRE este tipo; qual
 * implementação responde — HTTP real ou mock — é decidido no
 * `GraficosExecutivosModule` a partir de `environment.usarMock`.
 *
 * Trocar mock por BFF real = mudar uma flag. Nenhum componente muda.
 */
export abstract class GraficosExecutivosService {
  /** Opções disponíveis para Produto / Origem / Risco + limites do período. */
  abstract carregarOpcoesFiltro(): Observable<OpcoesFiltroDto>;

  /** Envelope agregado: KPIs + série temporal + os três cards. */
  abstract carregarDashboard(filtros: FiltrosGraficos): Observable<DashboardGraficosDto>;

  /** Relatório analítico paginado, sob o mesmo recorte de filtros. */
  abstract carregarAnalitico(
    filtros: FiltrosGraficos,
    pagina: ParametrosPagina,
  ): Observable<PaginaDto<LinhaAnaliticoDto>>;
}
