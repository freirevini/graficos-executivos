/**
 * CONTRATO DE DADOS (DTOs) — Home / Início.
 *
 * Tudo aqui é PREMISSA assumida no desenvolvimento isolado — mesmas convenções
 * do contrato de Gráficos Executivos (ver README, seção "Pontos de
 * integração"). Não importa nada da outra feature: cada feature é um pacote
 * portável independente.
 *
 * Convenções assumidas:
 *  - datas em ISO-8601 (`YYYY-MM-DD` para dia, `YYYY-MM` para competência);
 *  - percentuais como número de 0 a 100 (ex.: 22.43), nunca 0..1;
 *  - toda dimensão categórica trafega como par `chave` + `rotulo`.
 */

export interface PeriodoInicioDto {
  de: string;  // YYYY-MM-DD
  ate: string; // YYYY-MM-DD
}

/** GET {base}/inicio/resumo */
export interface ResumoInicioDto {
  /** ISO datetime do fechamento do dado no BFF. */
  geradoEm: string;
  /** Ano civil ao qual `uso` se refere (ano corrente). */
  ano: number;
  uso: UsoAnualDto;
  /** Uma entrada por competência do ano corrente, em ordem cronológica. */
  serieMensal: PontoMensalInicioDto[];
  configuracao: ConfiguracaoProjetoDto;
}

/** Volume e desempenho agregados do ano corrente. */
export interface UsoAnualDto {
  pecasAnalisadas: number;
  pecasAprovadas: number;
  pecasReprovadas: number;
  /** 0..100 */
  percentualConformidade: number;
  tempoMedioSegundos: number;
  pecasMesCorrente: number;
  pecasMesAnterior: number;
  /** YYYY-MM-DD da primeira peça já registrada na base (não só do ano). */
  desde: string;
}

/** Ponto da série mensal do ano corrente, usada nos sparklines dos KPIs. */
export interface PontoMensalInicioDto {
  /** Competência YYYY-MM. */
  competencia: string;
  /** Rótulo pronto para exibição (ex.: "ago/26"). */
  rotulo: string;
  total: number;
  aprovadas: number;
  reprovadas: number;
  /** Tempo médio de análise das peças do mês, em segundos. */
  tempoMedioSegundos: number;
}

/** Um modelo de IA participante do pipeline de análise. */
export interface ModeloIaDto {
  chave: string;
  rotulo: string;
  /** Papel do modelo no pipeline (ex.: "Triagem inicial e extração de texto"). */
  papel: string;
  /** 0..100 — fração das peças do período que passaram por este modelo. */
  participacaoPercentual: number;
  /** Versão do modelo (ex.: "v3.2.1", "3.1-pro", "3.8-flash"). */
  versao?: string;
  /** Data de lançamento em MM/YYYY. */
  dataLancamento?: string;
  /** URL ou referência ao logo do modelo (ex.: "gemini", "openai", "claude"). */
  logo?: string;
}

/** Configuração vigente do projeto — como o sistema está operando hoje. */
export interface ConfiguracaoProjetoDto {
  modelos: ModeloIaDto[];
  tempoMedioSegundos: number;
  /** Versão do conjunto de prompts em produção (ex.: "v3.2.1"). */
  versaoPrompt: string;
  /** Janela de dados coberta pela base usada nas análises. */
  janelaDados: PeriodoInicioDto;
  /** ISO datetime da última atualização desta configuração. */
  atualizadoEm: string;
}

/** Uma peça recente na lista da Home. GET {base}/inicio/ultimas-analises?limite=N */
export interface UltimaAnaliseDto {
  /** Identificador da peça (ex.: `PC-10957`). */
  id: string;
  produto: { chave: string; rotulo: string };
  /** ISO-8601 local (ex.: `2026-09-13T18:24:00`). */
  dataAvaliacao: string;
  /** O domínio só tem estes dois resultados (decisão D4-c). */
  resultado: 'APROVADA' | 'REPROVADA';
}
