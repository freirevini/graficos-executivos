import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * PLACEHOLDER — NÃO PORTAR PARA O PROJETO REAL.
 *
 * No repositório corporativo o JWT do SSO Atlante já é anexado por um
 * interceptor existente do chassi (@arqt/ng15-framework). Esta classe existe
 * apenas para que o comportamento fique explícito durante o desenvolvimento
 * isolado e para documentar o contrato esperado:
 *
 *   - header: `Authorization: Bearer <jwt>`
 *   - escopo: toda request cujo path comece com `environment.api.baseUrl`
 *   - renovação/expiração: responsabilidade do interceptor do chassi
 *
 * PONTO DE INTEGRAÇÃO: ao exportar a feature, remova este arquivo e o provider
 * correspondente em `AppModule`. Nenhum service da feature depende dele.
 */
@Injectable()
export class AuthPlaceholderInterceptor implements HttpInterceptor {
  intercept(requisicao: HttpRequest<unknown>, proximo: HttpHandler): Observable<HttpEvent<unknown>> {
    // Intencionalmente sem efeito: em dev não há SSO, e em produção quem anexa
    // o token é o interceptor do chassi.
    return proximo.handle(requisicao);
  }
}
