import { HttpErrorResponse } from '@angular/common/http';
import { mapearErro } from './erro-carregamento.model';

describe('mapearErro', () => {
  const resposta = (status: number) => new HttpErrorResponse({ status, statusText: 'x' });

  it('trata falha de rede como recuperável', () => {
    const erro = mapearErro(resposta(0));
    expect(erro.status).toBe(0);
    expect(erro.permiteNovaTentativa).toBeTrue();
  });

  it('não oferece nova tentativa em 401/403 — repetir não resolve sessão expirada', () => {
    expect(mapearErro(resposta(401)).permiteNovaTentativa).toBeFalse();
    expect(mapearErro(resposta(403)).permiteNovaTentativa).toBeFalse();
  });

  it('oferece nova tentativa em erro de servidor', () => {
    expect(mapearErro(resposta(500)).permiteNovaTentativa).toBeTrue();
  });

  it('não vaza detalhe técnico na mensagem de 4xx', () => {
    const erro = mapearErro(resposta(422));
    expect(erro.mensagem).not.toContain('422');
    expect(erro.permiteNovaTentativa).toBeFalse();
  });

  it('degrada com segurança em erro não-HTTP', () => {
    const erro = mapearErro(new TypeError('boom'));
    expect(erro.status).toBe(-1);
    expect(erro.mensagem).not.toContain('boom');
  });
});
