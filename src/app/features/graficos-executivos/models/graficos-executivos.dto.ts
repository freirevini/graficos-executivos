import { Granularidade } from './filtros.model';

/**
 * CONTRATO DE DADOS (DTOs) — Gráficos Executivos.
 *
 * Tudo aqui é PREMISSA assumida no desenvolvimento isolado. Ver README.md,
 * seção "Pontos de integração", antes de plugar no BFF real.
 *
 * Convenções assumidas:
 *  - datas em ISO-8601 (`YYYY-MM-DD` para dia, `YYYY-MM` para competência);
 *  - percentuais como número de 0 a 100 (ex.: 22.43), nunca 0..1;
 *  - toda dimensão categórica trafega como par `chave` (estável, para filtro)
 *    + `rotulo` (texto já traduzido pelo BFF, para exibição).
 */

// --- Primitivos compartilhados ---------------------------------------------

export type ResultadoAvaliacao = 'APROVADA' | 'REPROVADA';

/** Par chave/rótulo usado por toda dimensão categórica. */
export interface OpcaoDto {
  chave: string;
  rotulo: string;
  /** Opcional: ordena severidade de risco (1 = mais brando). */
  ordem?: number;
}

export interface PeriodoDto {
  de: string;  // YYYY-MM-DD
  ate: string; // YYYY-MM-DD
}

// --- Filtros ----------------------------------------------------------------

/** GET {base}/filtros */
export interface OpcoesFiltroDto {
  produtos: OpcaoDto[];
  origens: OpcaoDto[];
  riscos: OpcaoDto[];
  /** Menor e maior data com dados, para limitar o date-range picker. */
  periodoDisponivel: PeriodoDto;
}

// --- Envelope do dashboard --------------------------------------------------

/** GET {base}?de&ate&produto&origem&risco&mes */
export interface DashboardGraficosDto {
  periodo: PeriodoDto;
  kpis: KpisDto;
  serieTemporal: PontoSerieTemporalDto[];
  /** Granularidade efetivamente aplicada em `serieTemporal`. Eco do pedido. */
  granularidadeSerie: Granularidade;
  reprovacaoPorRisco: ReprovacaoPorRiscoDto[];
  origemPorResultado: OrigemPorResultadoDto[];
  totalPorProduto: TotalPorProdutoDto[];
  /** ISO datetime do fechamento do dado no BFF. Exibido no cabeçalho. */
  atualizadoEm: string;
}

/** Faixa de indicadores do topo. */
export interface KpisDto {
  totalPecas: number;
  pecasAprovadas: number;
  pecasReprovadas: number;
  /** 0..100 */
  percentualReprovacao: number;
  /** Mesmos indicadores no período imediatamente anterior, de igual duração. */
  periodoAnterior?: Omit<KpisDto, 'periodoAnterior'>;
}

/** Bloco principal: série temporal Aprovadas x Reprovadas + % de reprovação. */
export interface PontoSerieTemporalDto {
  /**
   * Chave do ponto, usada no cross-filter por clique:
   *  - granularidade `mes` -> competência `YYYY-MM`;
   *  - granularidade `dia` -> data `YYYY-MM-DD`.
   */
  periodo: string;
  /** Rótulo pronto para o eixo X (ex.: "ago/26" ou "14/09"). */
  rotulo: string;
  aprovadas: number;
  reprovadas: number;
  /** 0..100, plotado no eixo Y direito. */
  percentualReprovacao: number;
}

/** Card 1: reprovação por risco atrelado. */
export interface ReprovacaoPorRiscoDto extends OpcaoDto {
  total: number;
  reprovadas: number;
  /** 0..100 */
  percentualReprovacao: number;
}

/** Card 2: origem x resultado (barras empilhadas). */
export interface OrigemPorResultadoDto extends OpcaoDto {
  aprovadas: number;
  reprovadas: number;
  /**
   * Total (aprovadas + reprovadas) deste canal no período imediatamente
   * anterior, de igual duração — mesmo cálculo de `KpisDto.periodoAnterior`,
   * mas por origem. Alimenta o KPI agregado do topo do card.
   * `undefined` quando o BFF ainda não devolve este recorte.
   */
  totalPeriodoAnterior?: number;
  /**
   * Reprovadas deste canal no período anterior, de igual duração. Junto com
   * `totalPeriodoAnterior`, dá a taxa de reprovação anterior — usada na
   * coluna "Δ" (variação em pontos percentuais da taxa de reprovação).
   * `undefined` quando o BFF ainda não devolve este recorte: a UI mostra "—"
   * em vez de inventar uma tendência.
   */
  reprovadasPeriodoAnterior?: number;
}

/** Card 3: total por produto + % reprovação, já ordenado do maior para o menor. */
export interface TotalPorProdutoDto extends OpcaoDto {
  total: number;
  reprovadas: number;
  /** 0..100 */
  percentualReprovacao: number;
}

// --- Relatório analítico ----------------------------------------------------

/** Envelope de paginação. PREMISSA: formato "Spring Data Page" simplificado. */
export interface PaginaDto<T> {
  conteudo: T[];
  pagina: number;        // base 0
  tamanho: number;
  totalElementos: number;
  totalPaginas: number;
}

/** GET {base}/analitico?...&pagina&tamanho&ordenarPor&direcao */
export interface LinhaAnaliticoDto {
  id: string;
  produto: OpcaoDto;
  /** ISO-8601 date-time. */
  dataAvaliacao: string;
  resultado: ResultadoAvaliacao;
  riscoAtrelado: OpcaoDto;
  /** Markdown gerado por LLM. Renderizar SEMPRE via MarkdownService. */
  parecerIa: string;
  /** Markdown gerado por LLM. Vazio quando resultado = APROVADA. */
  recomendacoesAjuste: string;
}

export type CampoOrdenacaoAnalitico =
  | 'produto'
  | 'dataAvaliacao'
  | 'resultado'
  | 'riscoAtrelado';

export interface ParametrosPagina {
  pagina: number;
  tamanho: number;
  ordenarPor: CampoOrdenacaoAnalitico;
  direcao: 'asc' | 'desc';
}
