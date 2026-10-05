const DOIS = (n: number): string => String(n).padStart(2, '0');

function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Data amigável de uma avaliação: "há 5 min", "há 2 h", "ontem, 16:40" ou
 * "03/10, 09:15". A data absoluta continua no `<time datetime>` da lista.
 */
export function dataRelativa(iso: string, agora = new Date()): string {
  const data = new Date(iso);
  const hora = `${DOIS(data.getHours())}:${DOIS(data.getMinutes())}`;
  const minutos = Math.floor((agora.getTime() - data.getTime()) / 60_000);

  if (minutos >= 0 && minutos < 60 && mesmoDia(data, agora)) {
    return `há ${Math.max(1, minutos)} min`;
  }
  if (minutos >= 60 && mesmoDia(data, agora)) {
    return `há ${Math.floor(minutos / 60)} h`;
  }
  const ontem = new Date(agora);
  ontem.setDate(ontem.getDate() - 1);
  if (mesmoDia(data, ontem)) {
    return `ontem, ${hora}`;
  }
  return `${DOIS(data.getDate())}/${DOIS(data.getMonth() + 1)}, ${hora}`;
}
