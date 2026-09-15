import { Params } from '@angular/router';

/** Como a série temporal é bucketizada: um ponto por dia ou por competência. */
export type Granularidade = 'dia' | 'mes';

/**
 * Estado de filtro da página. É a ÚNICA entrada que dispara recarga de dados —
 * tanto a barra de filtros quanto o clique num ponto do gráfico de correlação
 * terminam aqui (ver GraficosExecutivosStore).
 */
export interface FiltrosGraficos {
  /** YYYY-MM-DD */
  de: string;
  /** YYYY-MM-DD */
  ate: string;
  /**
   * Granularidade pedida ao BFF para a série temporal. Definida pelo seletor
   * de período do gráfico de correlação; um range customizado escolhido no
   * date-picker mantém a granularidade que estiver ativa.
   */
  granularidade: Granularidade;
  produtos: string[];
  origens: string[];
  riscos: string[];
  /**
   * Cross-filter: ponto selecionado por clique no gráfico de correlação.
   * `YYYY-MM-DD` quando a granularidade é `dia`, `YYYY-MM` quando é `mes`.
   * Preenchido, TODOS os demais blocos (KPIs, cards e relatório analítico) são
   * recalculados apenas para esse recorte.
   */
  periodo: string | null;
}

export type PresetPeriodo = '30d' | '3m' | 'ano';

export interface OpcaoPreset {
  valor: PresetPeriodo;
  rotulo: string;
  granularidade: Granularidade;
}

/**
 * Opções do seletor segmentado que fica no canto superior direito do card do
 * gráfico de correlação. A granularidade vem junto do preset: 30 dias é curto
 * demais para leitura mensal, e 3 meses / ano são longos demais para leitura
 * diária.
 */
export const PRESETS_PERIODO: readonly OpcaoPreset[] = [
  { valor: '30d', rotulo: '30 dias', granularidade: 'dia' },
  { valor: '3m', rotulo: '3 meses', granularidade: 'mes' },
  { valor: 'ano', rotulo: 'Ano atual', granularidade: 'mes' },
];

export const PRESET_PADRAO: PresetPeriodo = 'ano';

export function paraIsoData(data: Date): string {
  const ano = data.getFullYear();
  const mes = `${data.getMonth() + 1}`.padStart(2, '0');
  const dia = `${data.getDate()}`.padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function periodoDoPreset(preset: PresetPeriodo, hoje = new Date()): { de: string; ate: string } {
  const ate = new Date(hoje);
  const de = new Date(hoje);

  switch (preset) {
    case '30d':
      de.setDate(de.getDate() - 29);
      break;
    case '3m':
      // Três competências inteiras, contando a atual.
      de.setMonth(de.getMonth() - 2);
      de.setDate(1);
      break;
    case 'ano':
      de.setMonth(0, 1);
      break;
  }
  return { de: paraIsoData(de), ate: paraIsoData(ate) };
}

export function granularidadeDoPreset(preset: PresetPeriodo): Granularidade {
  return PRESETS_PERIODO.find((opcao) => opcao.valor === preset)?.granularidade ?? 'mes';
}

export function filtrosPadrao(hoje = new Date()): FiltrosGraficos {
  const { de, ate } = periodoDoPreset(PRESET_PADRAO, hoje);
  return {
    de,
    ate,
    granularidade: granularidadeDoPreset(PRESET_PADRAO),
    produtos: [],
    origens: [],
    riscos: [],
    periodo: null,
  };
}

/** Serializa para a URL, omitindo tudo que estiver no padrão (URL curta). */
export function paraQueryParams(filtros: FiltrosGraficos): Params {
  const params: Params = { de: filtros.de, ate: filtros.ate };
  if (filtros.granularidade !== 'mes') { params['granularidade'] = filtros.granularidade; }
  if (filtros.produtos.length) { params['produto'] = filtros.produtos.join(','); }
  if (filtros.origens.length) { params['origem'] = filtros.origens.join(','); }
  if (filtros.riscos.length) { params['risco'] = filtros.riscos.join(','); }
  if (filtros.periodo) { params['periodo'] = filtros.periodo; }
  return params;
}

function lista(valor: unknown): string[] {
  return typeof valor === 'string' && valor.length
    ? valor.split(',').map((item) => item.trim()).filter(Boolean)
    : [];
}

const PADRAO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const PADRAO_MES = /^\d{4}-\d{2}$/;

/** Aceita competência (`YYYY-MM`) ou dia (`YYYY-MM-DD`). */
export function periodoValido(valor: unknown): valor is string {
  return typeof valor === 'string' && (PADRAO_MES.test(valor) || PADRAO_DATA.test(valor));
}

/** Reidrata o estado a partir da URL (deep-link e F5 preservam o recorte). */
export function deQueryParams(params: Params, hoje = new Date()): FiltrosGraficos {
  const padrao = filtrosPadrao(hoje);
  const de = typeof params['de'] === 'string' && PADRAO_DATA.test(params['de']) ? params['de'] : padrao.de;
  const ate = typeof params['ate'] === 'string' && PADRAO_DATA.test(params['ate']) ? params['ate'] : padrao.ate;
  const granularidade: Granularidade = params['granularidade'] === 'dia' ? 'dia' : 'mes';
  const periodo = periodoValido(params['periodo']) ? params['periodo'] : null;

  return {
    de,
    ate,
    granularidade,
    produtos: lista(params['produto']),
    origens: lista(params['origem']),
    riscos: lista(params['risco']),
    // Um recorte de dia numa visão mensal (ou vice-versa) não faz sentido e
    // viria de URL editada à mão: descarta em vez de propagar estado inválido.
    periodo: periodo && granularidadeDoPeriodo(periodo) === granularidade ? periodo : null,
  };
}

/** Deduz a granularidade a partir do formato da chave do ponto. */
export function granularidadeDoPeriodo(periodo: string): Granularidade {
  return PADRAO_DATA.test(periodo) ? 'dia' : 'mes';
}

export function filtrosIguais(a: FiltrosGraficos, b: FiltrosGraficos): boolean {
  const mesmaLista = (x: string[], y: string[]) =>
    x.length === y.length && x.every((item, i) => item === y[i]);

  return a.de === b.de
    && a.ate === b.ate
    && a.granularidade === b.granularidade
    && a.periodo === b.periodo
    && mesmaLista(a.produtos, b.produtos)
    && mesmaLista(a.origens, b.origens)
    && mesmaLista(a.riscos, b.riscos);
}

/** Qual preset corresponde ao recorte atual, ou `null` se for range customizado. */
export function presetAtivo(filtros: FiltrosGraficos, hoje = new Date()): PresetPeriodo | null {
  return PRESETS_PERIODO.find((opcao) => {
    const { de, ate } = periodoDoPreset(opcao.valor, hoje);
    return filtros.de === de
      && filtros.ate === ate
      && filtros.granularidade === opcao.granularidade;
  })?.valor ?? null;
}

/**
 * Há algum desvio do estado inicial da página? Conta o período também, não só
 * as dimensões: quem trocou só a janela de tempo precisa conseguir voltar.
 */
export function temFiltroAtivo(filtros: FiltrosGraficos, hoje = new Date()): boolean {
  return !filtrosIguais(filtros, filtrosPadrao(hoje));
}

