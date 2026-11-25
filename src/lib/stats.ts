import { Categoria, Movimiento } from '../api/types';
import { claveMes, moverMes } from './format';

export function totales(movs: Movimiento[]) {
  let ingresos = 0, gastos = 0;
  for (const m of movs) m.tipo === 'ingreso' ? (ingresos += m.monto) : (gastos += m.monto);
  return { ingresos, gastos, balance: ingresos - gastos };
}

export const delMes = (movs: Movimiento[], mes: string) => movs.filter((m) => claveMes(m.fecha) === mes);

/** Últimos n meses terminando en `mes`, con ingresos y gastos de cada uno. */
export function tendencia(movs: Movimiento[], mes: string, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const k = moverMes(mes, i - n + 1);
    return { mes: k, ...totales(delMes(movs, k)) };
  });
}

export function porCategoria(movs: Movimiento[], cats: Categoria[], tipo: 'ingreso' | 'gasto') {
  const mapa = new Map<string, number>();
  for (const m of movs) if (m.tipo === tipo) mapa.set(m.categoria, (mapa.get(m.categoria) || 0) + m.monto);
  const total = [...mapa.values()].reduce((a, b) => a + b, 0);
  return [...mapa.entries()]
    .map(([id, monto]) => {
      const c = cats.find((x) => x.id === id);
      return {
        id,
        nombre: c?.nombre ?? 'Sin categoría',
        icono: c?.icono ?? '•',
        color: c?.color ?? '#5B6B8C',
        presupuesto: c?.presupuesto ?? '',
        monto,
        pct: total ? monto / total : 0,
      };
    })
    .sort((a, b) => b.monto - a.monto);
}
