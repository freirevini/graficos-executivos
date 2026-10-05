import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, shareReplay, startWith, switchMap } from 'rxjs';
import { mapearErro } from '../../../core/models/erro-carregamento.model';
import { Recurso, carregando, falhou, manterDadoAnterior, pronto } from '../../../core/models/recurso.model';
import { InicioService } from '../data/inicio.service';
import { ResumoInicioDto, UltimaAnaliseDto } from '../models/inicio.dto';

export const LIMITE_ULTIMAS_ANALISES = 5;

/**
 * Estado da Home, em services + RxJS — mesmo padrão de `GraficosExecutivosStore`.
 *
 * Recargas preservam o último dado bom (`manterDadoAnterior`): a tela só esmaece,
 * sem voltar ao skeleton nem encolher.
 *
 * Fornecido no nível do componente de página: o estado morre junto com a rota.
 */
@Injectable()
export class InicioStore {
  private readonly recarregarSubject = new BehaviorSubject<void>(undefined);

  readonly resumo$: Observable<Recurso<ResumoInicioDto>> = this.recarregarSubject.pipe(
    switchMap(() =>
      this.servico.carregarResumo().pipe(
        map((dados) => pronto(dados)),
        catchError((erro) => of(falhou<ResumoInicioDto>(mapearErro(erro)))),
        startWith(carregando<ResumoInicioDto>()),
      ),
    ),
    manterDadoAnterior(),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  readonly ultimasAnalises$: Observable<Recurso<UltimaAnaliseDto[]>> = this.recarregarSubject.pipe(
    switchMap(() =>
      this.servico.carregarUltimasAnalises(LIMITE_ULTIMAS_ANALISES).pipe(
        map((dados) => pronto(dados)),
        catchError((erro) => of(falhou<UltimaAnaliseDto[]>(mapearErro(erro)))),
        startWith(carregando<UltimaAnaliseDto[]>()),
      ),
    ),
    manterDadoAnterior(),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  constructor(private readonly servico: InicioService) {}

  /** Re-dispara as cargas — botão "Tentar novamente" e atualização manual. */
  recarregar(): void {
    this.recarregarSubject.next();
  }
}
