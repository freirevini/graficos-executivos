import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, delay, map, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ConfiguracaoProjetoDto, PontoMensalInicioDto, ResumoInicioDto, UltimaAnaliseDto, UsoAnualDto } from '../models/inicio.dto';
import { InicioService } from './inicio.service';

/** Registro cru do mock de peças — mesma base usada pela feature executiva. */
interface PecaBrutaMock {
  id: string;
  produto: string;
  dataAvaliacao: string;
  resultado: 'APROVADA' | 'REPROVADA';
  duracaoAnaliseSegundos: number;
}

const RAIZ_PECAS = 'assets/mocks/graficos-executivos';
const RAIZ_INICIO = 'assets/mocks/inicio';

const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * Implementação de DESENVOLVIMENTO.
 *
 * Reaproveita `pecas.mock.json` (gerado por `tools/gerar-mocks.js`) para que o
 * volume anual mostrado na Home bata com os números da página executiva —
 * ambos derivam da mesma base. `configuracao.mock.json` já vem pronto do
 * gerador (participação por modelo já calculada sobre a base inteira).
 *
 * Para simular falha e exercitar o estado de erro da tela, acrescente
 * `?simularErro=1` à URL (mesmo mecanismo da feature executiva).
 */
@Injectable()
export class InicioMockService extends InicioService {
  private readonly pecas$ = this.http
    .get<PecaBrutaMock[]>(`${RAIZ_PECAS}/pecas.mock.json`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  private readonly produtos$ = this.http
    .get<{ produtos: { chave: string; rotulo: string }[] }>(`${RAIZ_PECAS}/filtros.mock.json`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  private readonly configuracao$ = this.http
    .get<ConfiguracaoProjetoDto>(`${RAIZ_INICIO}/configuracao.mock.json`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  constructor(private readonly http: HttpClient) {
    super();
  }

  carregarUltimasAnalises(limite: number): Observable<UltimaAnaliseDto[]> {
    return this.comLatencia(
      this.pecas$.pipe(
        switchMap((pecas) =>
          this.produtos$.pipe(
            map((filtros) => {
              const rotulos = new Map(filtros.produtos.map((p) => [p.chave, p.rotulo]));
              return [...pecas]
                .sort((a, b) => (a.dataAvaliacao < b.dataAvaliacao ? 1 : -1))
                .slice(0, limite)
                .map((p) => ({
                  id: p.id,
                  produto: { chave: p.produto, rotulo: rotulos.get(p.produto) ?? p.produto },
                  dataAvaliacao: p.dataAvaliacao,
                  resultado: p.resultado,
                }));
            }),
          ),
        ),
      ),
    );
  }

  carregarResumo(): Observable<ResumoInicioDto> {
    return this.comLatencia(
      this.pecas$.pipe(
        switchMap((pecas) => this.configuracao$.pipe(map((configuracao) => this.montarResumo(pecas, configuracao)))),
      ),
    );
  }

  private montarResumo(pecas: PecaBrutaMock[], configuracao: ConfiguracaoProjetoDto): ResumoInicioDto {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mesCorrente = agora.getMonth();

    const doAno = pecas.filter((p) => new Date(p.dataAvaliacao).getFullYear() === ano);
    const aprovadas = doAno.filter((p) => p.resultado === 'APROVADA').length;
    const reprovadas = doAno.length - aprovadas;
    const tempoMedioSegundos = doAno.length
      ? Math.round(doAno.reduce((soma, p) => soma + p.duracaoAnaliseSegundos, 0) / doAno.length)
      : 0;

    const noMes = (mes: number, anoDoMes: number) =>
      pecas.filter((p) => {
        const data = new Date(p.dataAvaliacao);
        return data.getFullYear() === anoDoMes && data.getMonth() === mes;
      }).length;

    const [mesAnteriorNumero, anoDoMesAnterior] = mesCorrente === 0 ? [11, ano - 1] : [mesCorrente - 1, ano];

    const desde = pecas.reduce((minima, p) => (p.dataAvaliacao < minima ? p.dataAvaliacao : minima), pecas[0]?.dataAvaliacao ?? '')
      .slice(0, 10);

    const uso: UsoAnualDto = {
      pecasAnalisadas: doAno.length,
      pecasAprovadas: aprovadas,
      pecasReprovadas: reprovadas,
      percentualConformidade: doAno.length ? this.arredondar((aprovadas / doAno.length) * 100) : 0,
      tempoMedioSegundos,
      pecasMesCorrente: noMes(mesCorrente, ano),
      pecasMesAnterior: noMes(mesAnteriorNumero, anoDoMesAnterior),
      desde,
    };

    const serieMensal: PontoMensalInicioDto[] = [];
    for (let mes = 0; mes <= mesCorrente; mes++) {
      const doMes = doAno.filter((p) => new Date(p.dataAvaliacao).getMonth() === mes);
      const aprovadasDoMes = doMes.filter((p) => p.resultado === 'APROVADA').length;
      const tempoMedioDoMes = doMes.length
        ? Math.round(doMes.reduce((soma, p) => soma + p.duracaoAnaliseSegundos, 0) / doMes.length)
        : 0;
      serieMensal.push({
        competencia: `${ano}-${String(mes + 1).padStart(2, '0')}`,
        rotulo: `${NOMES_MES[mes]}/${String(ano).slice(2)}`,
        total: doMes.length,
        aprovadas: aprovadasDoMes,
        reprovadas: doMes.length - aprovadasDoMes,
        tempoMedioSegundos: tempoMedioDoMes,
      });
    }

    return {
      geradoEm: agora.toISOString(),
      ano,
      uso,
      serieMensal,
      configuracao,
    };
  }

  private arredondar(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  private comLatencia<T>(origem: Observable<T>): Observable<T> {
    if (this.deveSimularErro()) {
      return throwError(() => new Error('Falha simulada via ?simularErro=1')).pipe(
        delay(environment.atrasoMockMs),
      );
    }
    return origem.pipe(delay(environment.atrasoMockMs));
  }

  private deveSimularErro(): boolean {
    return typeof window !== 'undefined' && window.location.search.includes('simularErro=1');
  }
}
