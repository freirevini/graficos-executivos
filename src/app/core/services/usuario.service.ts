import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface UsuarioAtual {
  nome: string;
  /** Primeiro nome, para a saudação do hero da Home. */
  primeiroNome: string;
  perfil: string;
}

/**
 * STUB — no repositório real o nome e o perfil vêm do JWT/SSO Atlante,
 * anexado pelo interceptor do chassi (ver `AuthPlaceholderInterceptor`,
 * README seção "Pontos de integração"). Aqui é um valor fixo só para dar
 * contexto visual à Home durante o desenvolvimento isolado.
 *
 * PONTO DE INTEGRAÇÃO: trocar `usuarioAtual$` por uma leitura do token
 * decodificado (ou de um serviço de sessão do chassi), mantendo a interface
 * `UsuarioAtual`.
 */
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  readonly usuarioAtual$: Observable<UsuarioAtual> = of({
    nome: 'Vinicius Freire',
    primeiroNome: 'Vinicius',
    perfil: 'Compliance',
  });
}
