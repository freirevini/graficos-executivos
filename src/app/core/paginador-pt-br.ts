import { MatPaginatorIntl } from '@angular/material/paginator';

/**
 * Rótulos do mat-paginator em pt-BR.
 *
 * PONTO DE INTEGRAÇÃO: se o chassi já fornecer um MatPaginatorIntl traduzido,
 * remova este arquivo e o provider correspondente para não sobrescrevê-lo.
 */
export function paginadorPtBr(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  intl.itemsPerPageLabel = 'Itens por página';
  intl.nextPageLabel = 'Próxima página';
  intl.previousPageLabel = 'Página anterior';
  intl.firstPageLabel = 'Primeira página';
  intl.lastPageLabel = 'Última página';
  intl.getRangeLabel = (pagina, tamanho, total) => {
    if (total === 0 || tamanho === 0) {
      return `0 de ${total}`;
    }
    const inicio = pagina * tamanho;
    const fim = Math.min(inicio + tamanho, total);
    return `${inicio + 1} – ${fim} de ${total}`;
  };
  return intl;
}
