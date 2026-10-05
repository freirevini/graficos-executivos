import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Recurso, carregando, falhou, pronto } from '../../../../core/models/recurso.model';
import { UltimaAnaliseDto } from '../../models/inicio.dto';
import { UltimasAnalisesComponent } from './ultimas-analises.component';

const AGORA = new Date(2026, 9, 5, 15, 0);

const LISTA: UltimaAnaliseDto[] = [
  { id: 'PC-2', produto: { chave: 'SEGUROS', rotulo: 'Seguros' }, dataAvaliacao: '2026-10-05T12:30:00', resultado: 'REPROVADA' },
  { id: 'PC-1', produto: { chave: 'CARTAO', rotulo: 'Cartão de Crédito' }, dataAvaliacao: '2026-10-04T16:40:00', resultado: 'APROVADA' },
];

describe('UltimasAnalisesComponent', () => {
  let fixture: ComponentFixture<UltimasAnalisesComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  function render(recurso: Recurso<UltimaAnaliseDto[]> | null): void {
    fixture.componentRef.setInput('recurso', recurso);
    fixture.componentRef.setInput('agora', AGORA);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [UltimasAnalisesComponent, RouterTestingModule] });
    fixture = TestBed.createComponent(UltimasAnalisesComponent);
  });

  it('lista produto, data relativa e status em texto (sem o id da peça)', () => {
    render(pronto(LISTA));

    const linhas = Array.from(el().querySelectorAll('.lista__item')).map((l) => l.textContent?.replace(/\s+/g, ' ').trim());
    expect(linhas[0]).toContain('Seguros');
    expect(linhas[0]).not.toContain('PC-2');
    expect(el().querySelector('.lista__id')).toBeNull();
    expect(linhas[0]).toContain('há 2 h');
    expect(linhas[0]).toContain('Reprovada');
    expect(linhas[1]).toContain('ontem, 16:40');
    expect(linhas[1]).toContain('Aprovada');
    expect(el().querySelector('time')?.getAttribute('datetime')).toBe('2026-10-05T12:30:00');
  });

  it('link "Ver todas" leva aos gráficos executivos', () => {
    render(pronto(LISTA));
    expect(el().querySelector('a.ver-todas')?.getAttribute('href')).toBe('/graficos-executivos');
  });

  it('carregando mostra skeleton e erro mostra retry', () => {
    render(carregando());
    expect(el().querySelector('cf-skeleton')).not.toBeNull();

    let tentou = 0;
    fixture.componentInstance.tentarNovamente.subscribe(() => tentou++);
    render(falhou({ mensagem: 'Falha', status: 500, permiteNovaTentativa: true }));
    (el().querySelector('cf-estado button') as HTMLButtonElement).click();
    expect(tentou).toBe(1);
  });

  it('lista vazia mostra estado vazio', () => {
    render(pronto([]));
    expect(el().textContent).toContain('Nenhuma peça avaliada ainda.');
  });

  it('recarga com dado anterior mantém a lista e marca atualizando, sem skeleton', () => {
    render({ carregando: false, atualizando: true, dados: LISTA, erro: null });
    expect(el().querySelectorAll('.lista__item').length).toBe(2);
    expect(el().querySelector('cf-skeleton')).toBeNull();
    expect(el().querySelector('.cf-card__conteudo--atualizando')).not.toBeNull();
  });

  it('não renderiza HTML vindo dos dados (texto puro)', () => {
    render(pronto([{ ...LISTA[0], produto: { chave: 'X', rotulo: '<img src=x onerror=alert(1)>' } }]));
    expect(el().querySelector('.lista img')).toBeNull();
    expect(el().querySelector('.lista__produto')?.textContent).toContain('<img');
  });
});
