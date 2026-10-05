import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, delay, map, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FiltrosGraficos, Granularidade, paraIsoData } from '../models/filtros.model';
import {
  DashboardGraficosDto,
  KpisDto,
  LinhaAnaliticoDto,
  OpcaoDto,
  OpcoesFiltroDto,
  OrigemPorResultadoDto,
  PaginaDto,
  ParametrosPagina,
  PontoSerieTemporalDto,
  ReprovacaoPorRiscoDto,
  ResultadoAvaliacao,
  TotalPorProdutoDto,
} from '../models/graficos-executivos.dto';
import { GraficosExecutivosService } from './graficos-executivos.service';

/** Registro cru do mock. Existe só aqui — o BFF real entrega já agregado. */
interface PecaBrutaMock {
  id: string;
  dataAvaliacao: string;
  produto: string;
  origem: string;
  riscoAtrelado: string;
  resultado: ResultadoAvaliacao;
  parecerIa: string;
  recomendacoesAjuste: string;
}

const RAIZ_MOCK = 'assets/mocks/graficos-executivos';

/**
 * Implementação de DESENVOLVIMENTO.
 *
 * Carrega uma base crua de peças (`pecas.mock.json`) e faz, no cliente, a mesma
 * agregação que o BFF fará no servidor. Isso é proposital: garante que filtros
 * e cross-filter por mês produzam efeito visível de verdade durante o ajuste da
 * tela, em vez de devolver um JSON estático que ignora o recorte.
 *
 * Os arquivos são buscados por HttpClient com PATH EM STRING (sem `import` de
 * JSON), de modo que o código continue compilando mesmo que `src/assets/mocks/`
 * não exista — é o caso do repositório real, onde a pasta está no .gitignore.
 *
 * Para simular falha e exercitar o estado de erro da tela, acrescente
 * `?simularErro=1` à URL.
 */
@Injectable()
export class GraficosExecutivosMockService extends GraficosExecutivosService {
  private readonly opcoes$ = this.http
    .get<OpcoesFiltroDto>(`${RAIZ_MOCK}/filtros.mock.json`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  private readonly pecas$ = this.http
    .get<PecaBrutaMock[]>(`${RAIZ_MOCK}/pecas.mock.json`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  constructor(private readonly http: HttpClient) {
    super();
  }

  carregarOpcoesFiltro(): Observable<OpcoesFiltroDto> {
    return this.comLatencia(this.opcoes$);
  }

  carregarDashboard(filtros: FiltrosGraficos): Observable<DashboardGraficosDto> {
    return this.comLatencia(
      this.pecas$.pipe(
        switchMap((pecas) => this.opcoes$.pipe(map((opcoes) => this.montarDashboard(pecas, opcoes, filtros)))),
      ),
    );
  }

  carregarAnalitico(
    filtros: FiltrosGraficos,
    pagina: ParametrosPagina,
  ): Observable<PaginaDto<LinhaAnaliticoDto>> {
    return this.comLatencia(
      this.pecas$.pipe(
        switchMap((pecas) => this.opcoes$.pipe(map((opcoes) => this.montarPagina(pecas, opcoes, filtros, pagina)))),
      ),
    );
  }

  // --- Montagem do dashboard ------------------------------------------------

  private montarDashboard(
    pecas: PecaBrutaMock[],
    opcoes: OpcoesFiltroDto,
    filtros: FiltrosGraficos,
  ): DashboardGraficosDto {
    // A série temporal ignora o cross-filter de mês de propósito: o usuário
    // precisa continuar enxergando todos os meses para poder trocar/desfazer a
    // seleção. Quem respeita o mês são os KPIs, os três cards e o analítico.
    const base = this.filtrar(pecas, filtros, { ignorarPeriodo: true });
    const recorte = filtros.periodo
      ? base.filter((p) => this.chave(p, filtros.granularidade) === filtros.periodo)
      : base;

    return {
      periodo: { de: filtros.de, ate: filtros.ate },
      kpis: this.montarKpis(recorte, this.recorteAnterior(pecas, filtros)),
      serieTemporal: this.montarSerieTemporal(base, filtros),
      granularidadeSerie: filtros.granularidade,
      reprovacaoPorRisco: this.montarPorRisco(recorte, opcoes.riscos),
      origemPorResultado: this.montarPorOrigem(recorte, opcoes.origens, this.recorteAnterior(pecas, filtros)),
      totalPorProduto: this.montarPorProduto(recorte, opcoes.produtos),
      atualizadoEm: new Date().toISOString(),
    };
  }

  private montarKpis(recorte: PecaBrutaMock[], anterior: PecaBrutaMock[]): KpisDto {
    const calcular = (lista: PecaBrutaMock[]): Omit<KpisDto, 'periodoAnterior'> => {
      const total = lista.length;
      const reprovadas = lista.filter((p) => p.resultado === 'REPROVADA').length;
      return {
        totalPecas: total,
        pecasAprovadas: total - reprovadas,
        pecasReprovadas: reprovadas,
        percentualReprovacao: total ? this.arredondar((reprovadas / total) * 100) : 0,
      };
    };

    return { ...calcular(recorte), periodoAnterior: calcular(anterior) };
  }

  private montarSerieTemporal(base: PecaBrutaMock[], filtros: FiltrosGraficos): PontoSerieTemporalDto[] {
    const { granularidade } = filtros;
    const chaves = granularidade === 'dia'
      ? this.diasDoPeriodo(filtros.de, filtros.ate)
      : this.mesesDoPeriodo(filtros.de, filtros.ate);

    // Baldes pré-criados garantem que período sem peça apareça como zero, em
    // vez de sumir do eixo e distorcer a leitura da tendência.
    const baldes = new Map<string, { aprovadas: number; reprovadas: number }>();
    chaves.forEach((chave) => baldes.set(chave, { aprovadas: 0, reprovadas: 0 }));

    base.forEach((peca) => {
      const balde = baldes.get(this.chave(peca, granularidade));
      if (!balde) {
        return;
      }
      if (peca.resultado === 'REPROVADA') {
        balde.reprovadas += 1;
      } else {
        balde.aprovadas += 1;
      }
    });

    return chaves.map((chave) => {
      const balde = baldes.get(chave) ?? { aprovadas: 0, reprovadas: 0 };
      const total = balde.aprovadas + balde.reprovadas;
      return {
        periodo: chave,
        rotulo: granularidade === 'dia' ? this.rotuloDia(chave) : this.rotuloMes(chave),
        aprovadas: balde.aprovadas,
        reprovadas: balde.reprovadas,
        percentualReprovacao: total ? this.arredondar((balde.reprovadas / total) * 100) : 0,
      };
    });
  }

  private montarPorRisco(recorte: PecaBrutaMock[], riscos: OpcaoDto[]): ReprovacaoPorRiscoDto[] {
    return riscos
      .map((risco) => {
        const doRisco = recorte.filter((p) => p.riscoAtrelado === risco.chave);
        const reprovadas = doRisco.filter((p) => p.resultado === 'REPROVADA').length;
        return {
          ...risco,
          total: doRisco.length,
          reprovadas,
          percentualReprovacao: doRisco.length ? this.arredondar((reprovadas / doRisco.length) * 100) : 0,
        };
      })
      .filter((item) => item.total > 0);
  }

  private montarPorOrigem(
    recorte: PecaBrutaMock[],
    origens: OpcaoDto[],
    anterior: PecaBrutaMock[],
  ): OrigemPorResultadoDto[] {
    return origens
      .map((origem) => {
        const daOrigem = recorte.filter((p) => p.origem === origem.chave);
        const reprovadas = daOrigem.filter((p) => p.resultado === 'REPROVADA').length;
        const daOrigemAnterior = anterior.filter((p) => p.origem === origem.chave);
        return {
          ...origem,
          aprovadas: daOrigem.length - reprovadas,
          reprovadas,
          totalPeriodoAnterior: daOrigemAnterior.length,
          reprovadasPeriodoAnterior: daOrigemAnterior.filter((p) => p.resultado === 'REPROVADA').length,
        };
      })
      .filter((item) => item.aprovadas + item.reprovadas > 0);
  }

  private montarPorProduto(recorte: PecaBrutaMock[], produtos: OpcaoDto[]): TotalPorProdutoDto[] {
    return produtos
      .map((produto) => {
        const doProduto = recorte.filter((p) => p.produto === produto.chave);
        const reprovadas = doProduto.filter((p) => p.resultado === 'REPROVADA').length;
        return {
          ...produto,
          total: doProduto.length,
          reprovadas,
          percentualReprovacao: doProduto.length ? this.arredondar((reprovadas / doProduto.length) * 100) : 0,
        };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total); // contrato: já vem do maior para o menor
  }

  // --- Relatório analítico --------------------------------------------------

  private montarPagina(
    pecas: PecaBrutaMock[],
    opcoes: OpcoesFiltroDto,
    filtros: FiltrosGraficos,
    pagina: ParametrosPagina,
  ): PaginaDto<LinhaAnaliticoDto> {
    const rotuloDe = (lista: OpcaoDto[], chave: string): OpcaoDto =>
      lista.find((item) => item.chave === chave) ?? { chave, rotulo: chave };

    const filtradas = this.filtrar(pecas, filtros);
    const ordenadas = this.ordenar(filtradas, opcoes, pagina);
    const inicio = pagina.pagina * pagina.tamanho;

    return {
      conteudo: ordenadas.slice(inicio, inicio + pagina.tamanho).map((peca) => ({
        id: peca.id,
        produto: rotuloDe(opcoes.produtos, peca.produto),
        dataAvaliacao: peca.dataAvaliacao,
        resultado: peca.resultado,
        riscoAtrelado: rotuloDe(opcoes.riscos, peca.riscoAtrelado),
        parecerIa: peca.parecerIa,
        recomendacoesAjuste: peca.recomendacoesAjuste,
      })),
      pagina: pagina.pagina,
      tamanho: pagina.tamanho,
      totalElementos: ordenadas.length,
      totalPaginas: Math.max(1, Math.ceil(ordenadas.length / pagina.tamanho)),
    };
  }

  private ordenar(
    lista: PecaBrutaMock[],
    opcoes: OpcoesFiltroDto,
    pagina: ParametrosPagina,
  ): PecaBrutaMock[] {
    const ordemRisco = new Map(opcoes.riscos.map((r, i) => [r.chave, r.ordem ?? i]));
    const sinal = pagina.direcao === 'asc' ? 1 : -1;

    const chave = (peca: PecaBrutaMock): string | number => {
      switch (pagina.ordenarPor) {
        case 'produto': return peca.produto;
        case 'resultado': return peca.resultado;
        case 'riscoAtrelado': return ordemRisco.get(peca.riscoAtrelado) ?? 0;
        case 'dataAvaliacao':
        default: return peca.dataAvaliacao;
      }
    };

    return [...lista].sort((a, b) => {
      const x = chave(a);
      const y = chave(b);
      if (x === y) { return 0; }
      return (x < y ? -1 : 1) * sinal;
    });
  }

  // --- Utilitários ----------------------------------------------------------

  private filtrar(
    pecas: PecaBrutaMock[],
    filtros: FiltrosGraficos,
    opcoes: { ignorarPeriodo?: boolean } = {},
  ): PecaBrutaMock[] {
    return pecas.filter((peca) => {
      const dia = peca.dataAvaliacao.slice(0, 10);
      if (dia < filtros.de || dia > filtros.ate) { return false; }
      if (filtros.produtos.length && !filtros.produtos.includes(peca.produto)) { return false; }
      if (filtros.origens.length && !filtros.origens.includes(peca.origem)) { return false; }
      if (filtros.riscos.length && !filtros.riscos.includes(peca.riscoAtrelado)) { return false; }
      if (!opcoes.ignorarPeriodo
        && filtros.periodo
        && this.chave(peca, filtros.granularidade) !== filtros.periodo) { return false; }
      return true;
    });
  }

  /** Mesmo recorte, deslocado para o período imediatamente anterior de igual duração. */
  private recorteAnterior(pecas: PecaBrutaMock[], filtros: FiltrosGraficos): PecaBrutaMock[] {
    const de = new Date(`${filtros.de}T00:00:00`);
    const ate = new Date(`${filtros.ate}T00:00:00`);
    const duracaoMs = ate.getTime() - de.getTime();

    const ateAnterior = new Date(de.getTime() - 86_400_000);
    const deAnterior = new Date(ateAnterior.getTime() - duracaoMs);

    return this.filtrar(pecas, {
      ...filtros,
      periodo: null,
      de: deAnterior.toISOString().slice(0, 10),
      ate: ateAnterior.toISOString().slice(0, 10),
    });
  }

  /** Chave do balde: `YYYY-MM-DD` para dia, `YYYY-MM` para competência. */
  private chave(peca: PecaBrutaMock, granularidade: Granularidade): string {
    return peca.dataAvaliacao.slice(0, granularidade === 'dia' ? 10 : 7);
  }

  private diasDoPeriodo(de: string, ate: string): string[] {
    const dias: string[] = [];
    const cursor = new Date(`${de}T00:00:00`);
    const limite = new Date(`${ate}T00:00:00`);

    // Teto defensivo: a visão diária só é oferecida para janelas curtas, mas um
    // range customizado longo não pode gerar milhares de pontos no canvas.
    while (cursor <= limite && dias.length < 92) {
      dias.push(paraIsoData(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dias;
  }

  private rotuloDia(dia: string): string {
    const [, mes, diaDoMes] = dia.split('-');
    return `${diaDoMes}/${mes}`;
  }

  private mesesDoPeriodo(de: string, ate: string): string[] {
    const meses: string[] = [];
    const cursor = new Date(`${de.slice(0, 7)}-01T00:00:00`);
    const limite = `${ate.slice(0, 7)}-01`;

    while (`${cursor.toISOString().slice(0, 7)}-01` <= limite && meses.length < 60) {
      meses.push(cursor.toISOString().slice(0, 7));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return meses;
  }

  private rotuloMes(mes: string): string {
    const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const [ano, mesNumero] = mes.split('-');
    return `${nomes[Number(mesNumero) - 1]}/${ano.slice(2)}`;
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
