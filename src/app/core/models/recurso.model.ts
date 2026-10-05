import { MonoTypeOperatorFunction, scan } from 'rxjs';
import { ErroCarregamento } from './erro-carregamento.model';

/** Envelope de carregamento usado por todo bloco de dashboard da aplicação. */
export interface Recurso<T> {
  /** Primeira carga: ainda não há nada para desenhar, a UI mostra skeleton. */
  carregando: boolean;
  /** Recarga: já existe dado anterior na tela, que permanece visível e esmaecido. */
  atualizando: boolean;
  dados: T | null;
  erro: ErroCarregamento | null;
}

export function carregando<T>(): Recurso<T> {
  return { carregando: true, atualizando: false, dados: null, erro: null };
}
export function pronto<T>(dados: T): Recurso<T> {
  return { carregando: false, atualizando: false, dados, erro: null };
}
export function falhou<T>(erro: ErroCarregamento): Recurso<T> {
  return { carregando: false, atualizando: false, dados: null, erro };
}

/**
 * Stale-while-revalidate.
 *
 * Sem isto, cada troca de filtro (e cada clique de mês no gráfico) devolvia
 * `dados: null` e a página inteira virava skeleton — o layout encolhia e a
 * posição de rolagem saltava. Aqui a recarga preserva o último dado bom na
 * tela e apenas marca `atualizando`, então a altura da página não muda.
 *
 * Erro continua limpando os dados de propósito: melhor um estado de erro
 * explícito do que um número velho passando por atual.
 */
export function manterDadoAnterior<T>(): MonoTypeOperatorFunction<Recurso<T>> {
  return scan((anterior: Recurso<T>, atual: Recurso<T>) => {
    if (!atual.carregando) {
      return atual;
    }
    return anterior.dados
      ? { carregando: false, atualizando: true, dados: anterior.dados, erro: null }
      : carregando<T>();
  }, carregando<T>());
}
