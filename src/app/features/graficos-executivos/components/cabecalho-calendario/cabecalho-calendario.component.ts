import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  Optional,
  forwardRef,
} from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MatDateFormats } from '@angular/material/core';
import { MatCalendar, MatCalendarHeader, MatDatepickerIntl } from '@angular/material/datepicker';

/**
 * Cabeçalho do calendário do filtro de período.
 *
 * Existe por um motivo só: o cabeçalho padrão do Material pula da visão de
 * DIAS direto para a grade de ANOS (2016–2039), que é longe demais de onde o
 * usuário está — para trocar de mês ele precisava entrar no ano e voltar.
 *
 * Aqui o clique no rótulo percorre um degrau de cada vez:
 *
 *   dias  ->  meses do ano corrente  ->  anos  ->  dias
 *
 * O resto (rótulos, setas, limites de navegação) continua sendo o do Material:
 * só `currentPeriodClicked` muda.
 */
@Component({
  selector: 'gx-cabecalho-calendario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mat-calendar-header">
      <div class="mat-calendar-controls">
        <button
          mat-button
          type="button"
          class="mat-calendar-period-button"
          [attr.aria-label]="periodButtonLabel"
          (click)="currentPeriodClicked()">
          <span aria-hidden="true">{{ periodButtonText }}</span>
          <svg
            class="mat-calendar-arrow"
            [class.mat-calendar-invert]="calendar.currentView !== 'month'"
            viewBox="0 0 10 5"
            focusable="false"
            aria-hidden="true">
            <polygon points="0,0 5,5 10,0"></polygon>
          </svg>
        </button>

        <div class="mat-calendar-spacer"></div>

        <button
          mat-icon-button
          type="button"
          class="mat-calendar-previous-button"
          [disabled]="!previousEnabled()"
          [attr.aria-label]="prevButtonLabel"
          (click)="previousClicked()">
        </button>

        <button
          mat-icon-button
          type="button"
          class="mat-calendar-next-button"
          [disabled]="!nextEnabled()"
          [attr.aria-label]="nextButtonLabel"
          (click)="nextClicked()">
        </button>
      </div>
    </div>
  `,
})
export class CabecalhoCalendarioComponent<D> extends MatCalendarHeader<D> {
  constructor(
    intl: MatDatepickerIntl,
    @Inject(forwardRef(() => MatCalendar)) calendario: MatCalendar<D>,
    @Optional() adaptadorData: DateAdapter<D>,
    @Optional() @Inject(MAT_DATE_FORMATS) formatosData: MatDateFormats,
    detectorMudancas: ChangeDetectorRef,
  ) {
    super(intl, calendario, adaptadorData, formatosData, detectorMudancas);
  }

  /** Um degrau por clique, em vez do salto direto para a grade de anos. */
  override currentPeriodClicked(): void {
    const atual = this.calendar.currentView;
    this.calendar.currentView = atual === 'month' ? 'year' : atual === 'year' ? 'multi-year' : 'month';
  }
}
