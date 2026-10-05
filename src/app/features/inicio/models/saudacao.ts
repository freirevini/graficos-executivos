/**
 * Saudação e data por extenso do hero da Home.
 *
 * Funções puras — nada disto vem do BFF: a saudação depende só do relógio do
 * usuário, e trocar o texto não deve exigir mudança de contrato de dados.
 */

/** "Bom dia" (05h–11h59) · "Boa tarde" (12h–17h59) · "Boa noite" (18h–04h59). */
export function saudacaoPorHora(hora: number): string {
  if (hora >= 5 && hora < 12) {
    return 'Bom dia';
  }
  if (hora >= 12 && hora < 18) {
    return 'Boa tarde';
  }
  return 'Boa noite';
}

const DIAS_SEMANA = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado',
];

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** Ex.: "terça-feira, 15 de setembro". */
export function dataPorExtenso(data: Date): string {
  const diaSemana = DIAS_SEMANA[data.getDay()];
  const dia = data.getDate();
  const mes = MESES[data.getMonth()];
  return `${diaSemana}, ${dia} de ${mes}`;
}
