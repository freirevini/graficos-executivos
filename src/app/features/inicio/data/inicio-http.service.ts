import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../../../core/services/api-url.service';
import { ResumoInicioDto, UltimaAnaliseDto } from '../models/inicio.dto';
import { InicioService } from './inicio.service';

/**
 * Implementação real, contra o BFF via `/api`.
 *
 * PONTOS DE INTEGRAÇÃO (confirmar com o time do BFF):
 *  - nome dos endpoints (`/inicio/resumo` e `/inicio/ultimas-analises`);
 *  - shape do envelope agregado — ver `ResumoInicioDto`.
 */
@Injectable()
export class InicioHttpService extends InicioService {
  constructor(
    private readonly http: HttpClient,
    private readonly apiUrl: ApiUrlService,
  ) {
    super();
  }

  carregarResumo(): Observable<ResumoInicioDto> {
    return this.http.get<ResumoInicioDto>(this.apiUrl.inicio('/resumo'));
  }

  carregarUltimasAnalises(limite: number): Observable<UltimaAnaliseDto[]> {
    const params = new HttpParams().set('limite', limite);
    return this.http.get<UltimaAnaliseDto[]>(this.apiUrl.inicio('/ultimas-analises'), { params });
  }
}
