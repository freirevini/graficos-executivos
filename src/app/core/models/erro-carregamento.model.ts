import { HttpErrorResponse } from '@angular/common/http';

/** Erro normalizado que a camada de apresentação sabe exibir. */
export interface ErroCarregamento {
  /** Mensagem pronta para o usuário final. */
  mensagem: string;
  /** Status HTTP, quando houver. 0 = falha de rede/CORS. */
  status: number;
  /** Se true, a UI oferece botão "Tentar novamente". */
  permiteNovaTentativa: boolean;
}

/**
 * Converte qualquer falha em algo exibível, sem vazar stack trace nem corpo de
 * resposta do BFF para a tela.
 *
 * PONTO DE INTEGRAÇÃO: o projeto real provavelmente já possui um handler global
 * de erro no chassi. Se existir, delegue a ele e mantenha apenas o mapeamento
 * para `ErroCarregamento`.
 */
export function mapearErro(erro: unknown): ErroCarregamento {
  if (erro instanceof HttpErrorResponse) {
    switch (erro.status) {
      case 0:
        return {
          mensagem: 'Não foi possível falar com o servidor. Verifique sua conexão.',
          status: 0,
          permiteNovaTentativa: true,
        };
      case 401:
      case 403:
        return {
          mensagem: 'Sua sessão expirou ou você não tem acesso a estes indicadores.',
          status: erro.status,
          permiteNovaTentativa: false,
        };
      case 404:
        return {
          mensagem: 'Indicadores não encontrados para o recorte selecionado.',
          status: 404,
          permiteNovaTentativa: false,
        };
      default:
        return {
          mensagem: erro.status >= 500
            ? 'O servidor não conseguiu montar os indicadores agora. Tente novamente em instantes.'
            : 'Não foi possível carregar os indicadores.',
          status: erro.status,
          permiteNovaTentativa: erro.status >= 500,
        };
    }
  }

  return {
    mensagem: 'Ocorreu um erro inesperado ao montar os indicadores.',
    status: -1,
    permiteNovaTentativa: true,
  };
}
