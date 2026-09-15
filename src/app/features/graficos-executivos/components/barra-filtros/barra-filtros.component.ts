import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDateRangePicker } from '@angular/material/datepicker';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import {
  FiltrosGraficos,
  paraIsoData,
  temFiltroAtivo,
} from '../../models/filtros.model';
import { OpcaoDto, OpcoesFiltroDto } from '../../models/graficos-executivos.dto';
import { CabecalhoCalendarioComponent } from '../cabecalho-calendario/cabecalho-calendario.component';

/** Dimensões categóricas filtráveis — as três se comportam igual. */
type Dimensao = 'produtos' | 'origens' | 'riscos';

/** Um filtro aplicado, do jeito que ele aparece como chip removível. */
export interface ChipFiltro {
  /** `recorte` é o cross-filter de período vindo do gráfico. */
  tipo: Dimensao | 'recorte';
  chave: string;
  rotulo: string;
}

/**
 * Barra de filtros (dumb). Não conhece service nem store: recebe o estado e
 * emite intenção de mudança.
 *
 * Os atalhos de período vivem no seletor segmentado do card do gráfico de
 * correlação (gx-seletor-periodo); aqui fica apenas o range customizado, para
 * quando nenhum dos presets serve, mais as dimensões categóricas.
 *
 * Todos os filtros condicionam a página inteira — KPIs, os quatro gráficos e o
 * relatório analítico reagem juntos, porque quem os orquestra é o
 * GraficosExecutivosStore no container.
 *
 * LEITURA DO ESTADO: cada campo mostra um RESUMO da seleção ("Cartão +2") em
 * vez da lista truncada que o mat-select imprime por padrão, e tudo que está
 * aplicado aparece como chip removível logo abaixo — inclusive o recorte de
 * período vindo do gráfico. O chip é o que dá o "desfazer" item a item, que a
 * barra não tinha: antes só existia o Limpar, tudo ou nada.
 */
@Component({
  selector: 'gx-barra-filtros',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './barra-filtros.component.html',
  styleUrls: ['./barra-filtros.component.scss'],
})
export class BarraFiltrosComponent implements OnInit, OnDestroy {
  @Input() set filtros(valor: FiltrosGraficos) {
    this.filtrosAtuais = valor;
    this.formulario.patchValue(
      {
        periodo: { de: this.paraData(valor.de), ate: this.paraData(valor.ate) },
        produtos: valor.produtos,
        origens: valor.origens,
        riscos: valor.riscos,
      },
      { emitEvent: false },
    );
  }

  @Input() opcoes: OpcoesFiltroDto | null = null;
  @Input() carregando = false;

  @Output() filtrosAlterados = new EventEmitter<Partial<FiltrosGraficos>>();
  @Output() limparFiltros = new EventEmitter<void>();

  readonly formulario: FormGroup;

  /** Cabeçalho customizado do calendário — ver CabecalhoCalendarioComponent. */
  readonly cabecalhoCalendario = CabecalhoCalendarioComponent;

  filtrosAtuais: FiltrosGraficos | null = null;

  private readonly destruir$ = new Subject<void>();

  constructor(private readonly fb: FormBuilder) {
    this.formulario = this.fb.group({
      periodo: this.fb.group({ de: [null as Date | null], ate: [null as Date | null] }),
      produtos: [[] as string[]],
      origens: [[] as string[]],
      riscos: [[] as string[]],
    });
  }

  ngOnInit(): void {
    // debounce evita disparar uma requisição a cada tecla/clique intermediário
    // do date-range (que emite ao escolher a data inicial, ainda sem a final).
    this.formulario.valueChanges
      .pipe(debounceTime(250), takeUntil(this.destruir$))
      .subscribe(() => this.emitirMudanca());
  }

  ngOnDestroy(): void {
    this.destruir$.next();
    this.destruir$.complete();
  }

  /** Inclui o período: trocar só a janela já habilita o "Limpar filtros". */
  get podeLimpar(): boolean {
    return this.filtrosAtuais ? temFiltroAtivo(this.filtrosAtuais) : false;
  }

  /** Tudo que está aplicado agora, como lista de chips removíveis. */
  get chipsAtivos(): ChipFiltro[] {
    const filtros = this.filtrosAtuais;
    if (!filtros) {
      return [];
    }

    const chips: ChipFiltro[] = [
      ...this.chipsDaDimensao('produtos', filtros.produtos, this.opcoes?.produtos),
      ...this.chipsDaDimensao('origens', filtros.origens, this.opcoes?.origens),
      ...this.chipsDaDimensao('riscos', filtros.riscos, this.opcoes?.riscos),
    ];

    if (filtros.periodo) {
      chips.push({
        tipo: 'recorte',
        chave: filtros.periodo,
        rotulo: this.rotuloDoRecorte(filtros.periodo),
      });
    }
    return chips;
  }

  /** Resumo curto da seleção, para o gatilho do campo. */
  resumoSelecao(dimensao: Dimensao): string {
    const selecionados = this.formulario.get(dimensao)?.value as string[] | null;
    if (!selecionados?.length) {
      return '';
    }
    const primeiro = this.rotuloDe(this.opcoesDa(dimensao), selecionados[0] as string);
    return selecionados.length === 1 ? primeiro : `${primeiro} +${selecionados.length - 1}`;
  }

  /** Um campo com seleção ganha realce, para a barra dizer o que está ativo. */
  temSelecao(dimensao: Dimensao): boolean {
    return ((this.formulario.get(dimensao)?.value as string[] | null)?.length ?? 0) > 0;
  }

  /**
   * Clique num mês, na visão de meses do calendário, seleciona o MÊS INTEIRO
   * (dia 1 ao último) em vez de descer para a grade de dias. Quem quer um
   * intervalo solto continua com os dias, que é a visão em que o calendário
   * abre; a visão de meses passa a ser o atalho para "esse mês fechado".
   */
  selecionarMesInteiro(mes: Date, calendario: MatDateRangePicker<Date>): void {
    const primeiroDia = new Date(mes.getFullYear(), mes.getMonth(), 1);
    // Dia 0 do mês seguinte é o último dia deste — resolve fevereiro e
    // bissexto sem tabela de dias por mês.
    const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);

    this.formulario.get('periodo')?.setValue({ de: primeiroDia, ate: ultimoDia });
    calendario.close();
  }

  removerChip(chip: ChipFiltro): void {
    if (chip.tipo === 'recorte') {
      this.filtrosAlterados.emit({ periodo: null });
      return;
    }
    // Escreve no formulário: o `valueChanges` já propaga a mudança adiante,
    // então o chip e o campo nunca saem de sincronia.
    const restante = ((this.formulario.get(chip.tipo)?.value as string[]) ?? [])
      .filter((chave) => chave !== chip.chave);
    this.formulario.get(chip.tipo)?.setValue(restante);
  }

  private chipsDaDimensao(
    tipo: Dimensao,
    selecionados: string[],
    opcoes: OpcaoDto[] | undefined,
  ): ChipFiltro[] {
    return selecionados.map((chave) => ({ tipo, chave, rotulo: this.rotuloDe(opcoes, chave) }));
  }

  private opcoesDa(dimensao: Dimensao): OpcaoDto[] | undefined {
    if (dimensao === 'produtos') { return this.opcoes?.produtos; }
    if (dimensao === 'origens') { return this.opcoes?.origens; }
    return this.opcoes?.riscos;
  }

  /** Cai na própria chave quando as opções ainda não chegaram do BFF. */
  private rotuloDe(opcoes: OpcaoDto[] | undefined, chave: string): string {
    return opcoes?.find((opcao) => opcao.chave === chave)?.rotulo ?? chave;
  }

  /**
   * `2026-03` -> `mar/26`, `2026-03-12` -> `12/03/26`. O chip repete o rótulo
   * que o usuário clicou no gráfico, em vez da chave crua do recorte.
   */
  private rotuloDoRecorte(periodo: string): string {
    const [ano, mes, dia] = periodo.split('-');
    if (!ano || !mes) {
      return periodo;
    }
    const anoCurto = ano.slice(2);
    if (dia) {
      return `${dia}/${mes}/${anoCurto}`;
    }
    const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${MESES[Number(mes) - 1] ?? mes}/${anoCurto}`;
  }

  private emitirMudanca(): void {
    const bruto = this.formulario.getRawValue() as {
      periodo: { de: Date | null; ate: Date | null };
      produtos: string[];
      origens: string[];
      riscos: string[];
    };

    // Enquanto o usuário não fechar o range, `ate` vem nulo — não recarregamos.
    if (!bruto.periodo.de || !bruto.periodo.ate) {
      return;
    }

    // Trocar a janela descarta o recorte de ponto: a chave selecionada pode
    // não existir no novo intervalo.
    this.filtrosAlterados.emit({
      de: paraIsoData(bruto.periodo.de),
      ate: paraIsoData(bruto.periodo.ate),
      periodo: null,
      produtos: bruto.produtos ?? [],
      origens: bruto.origens ?? [],
      riscos: bruto.riscos ?? [],
    });
  }

  private paraData(iso: string): Date {
    return new Date(`${iso}T00:00:00`);
  }
}
