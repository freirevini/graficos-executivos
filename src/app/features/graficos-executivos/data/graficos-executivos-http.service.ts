import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../../../core/services/api-url.service';
import { FiltrosGraficos } from '../models/filtros.model';
import {
  DashboardGraficosDto,
  LinhaAnaliticoDto,
  OpcoesFiltroDto,
  PaginaDto,
  ParametrosPagina,
} from '../models/graficos-executivos.dto';
import { GraficosExecutivosService } from './graficos-executivos.service';

/**
 * Implementação real, contra o BFF Spring Boot via `/api`.
 *
 * O JWT do SSO Atlante NÃO é anexado aqui: no projeto real isso é feito pelo
 * interceptor do chassi (@arqt/ng15-framework). Ver AuthPlaceholderInterceptor.
 *
 * PONTOS DE INTEGRAÇÃO (confirmar com o time do BFF):
 *  - nomes dos endpoints  (`''`, `/filtros`, `/analitico`);
 *  - nomes dos query params (`de`, `ate`, `granularidade`, `produto`, `origem`,
 *    `risco`, `periodo`);
 *  - valores aceitos em `granularidade` (`dia` | `mes`) e o formato da chave de
 *    cada ponto da série temporal que o BFF devolve em resposta;
 *  - se listas vão como CSV (`produto=A,B`) ou repetidas (`produto=A&produto=B`).
 *    A implementação abaixo usa CSV — ver `aplicarFiltros`.
 */
@Injectable()
export class GraficosExecutivosHttpService extends GraficosExecutivosService {
  constructor(
    private readonly http: HttpClient,
    private readonly apiUrl: ApiUrlService,
  ) {
    super();
  }

  carregarOpcoesFiltro(): Observable<OpcoesFiltroDto> {
    return this.http.get<OpcoesFiltroDto>(this.apiUrl.graficosExecutivos('/filtros'));
  }

  carregarDashboard(filtros: FiltrosGraficos): Observable<DashboardGraficosDto> {
    return this.http.get<DashboardGraficosDto>(this.apiUrl.graficosExecutivos(), {
      params: this.aplicarFiltros(filtros),
    });
  }

  carregarAnalitico(
    filtros: FiltrosGraficos,
    pagina: ParametrosPagina,
  ): Observable<PaginaDto<LinhaAnaliticoDto>> {
    const params = this.aplicarFiltros(filtros)
      .set('pagina', pagina.pagina)
      .set('tamanho', pagina.tamanho)
      .set('ordenarPor', pagina.ordenarPor)
      .set('direcao', pagina.direcao);

    return this.http.get<PaginaDto<LinhaAnaliticoDto>>(
      this.apiUrl.graficosExecutivos('/analitico'),
      { params },
    );
  }

  private aplicarFiltros(filtros: FiltrosGraficos): HttpParams {
    let params = new HttpParams()
      .set('de', filtros.de)
      .set('ate', filtros.ate)
      .set('granularidade', filtros.granularidade);

    if (filtros.produtos.length) { params = params.set('produto', filtros.produtos.join(',')); }
    if (filtros.origens.length) { params = params.set('origem', filtros.origens.join(',')); }
    if (filtros.riscos.length) { params = params.set('risco', filtros.riscos.join(',')); }
    if (filtros.periodo) { params = params.set('periodo', filtros.periodo); }

    return params;
  }
}
