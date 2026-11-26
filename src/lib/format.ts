export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** "2026-11" */
export const claveMes = (fecha: string) => fecha.slice(0, 7);

export const mesActual = () => hoyISO().slice(0, 7);

export function moverMes(mes: string, delta: number) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_L = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const mesCorto = (mes: string) => MESES[Number(mes.slice(5, 7)) - 1];
export const mesLargo = (mes: string) => `${MESES_L[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`;

export function fechaLegible(fecha: string) {
  const hoy = hoyISO();
  if (fecha === hoy) return 'Hoy';
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  if (fecha === `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`) return 'Ayer';
  const [y, m, d] = fecha.split('-').map(Number);
  return `${d} ${MESES[m - 1]}${y !== new Date().getFullYear() ? ' ' + y : ''}`;
}

const cacheFmt = new Map<string, Intl.NumberFormat>();
/** Importe oculto (modo privacidad): conserva el símbolo de la moneda, p. ej. «S/ ***». */
export function dineroOculto(moneda = 'PEN') {
  const partes = new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).formatToParts(0);
  let puesto = false;
  return partes
    .map((p) => (p.type === 'currency' || p.type === 'literal' ? p.value : puesto ? '' : ((puesto = true), '***')))
    .join('');
}

export function dinero(n: number, moneda = 'PEN', compacto = false) {
  const k = moneda + compacto;
  if (!cacheFmt.has(k)) {
    cacheFmt.set(
      k,
      new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: moneda,
        ...(compacto ? { notation: 'compact', maximumFractionDigits: 1 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      }),
    );
  }
  return cacheFmt.get(k)!.format(n);
}

export const MONEDAS = [
  { code: 'PEN', label: 'Sol peruano (S/)' },
  { code: 'USD', label: 'Dólar (US$)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'MXN', label: 'Peso mexicano' },
  { code: 'COP', label: 'Peso colombiano' },
  { code: 'CLP', label: 'Peso chileno' },
  { code: 'ARS', label: 'Peso argentino' },
];
