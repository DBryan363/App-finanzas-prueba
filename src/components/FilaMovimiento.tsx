import { Categoria, Movimiento } from '../api/types';
import { dinero } from '../lib/format';

export function FilaMovimiento({ m, cat, moneda, onClick }: { m: Movimiento; cat?: Categoria; moneda: string; onClick?(): void }) {
  const ingreso = m.tipo === 'ingreso';
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `color-mix(in srgb, ${cat?.color ?? '#5B6B8C'} 16%, transparent)` }}>
        {cat?.icono ?? '•'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{m.nota || cat?.nombre || 'Movimiento'}</span>
        <span className="block truncate text-xs text-ink-2">{cat?.nombre ?? 'Sin categoría'}</span>
      </span>
      <span className={`tabular shrink-0 font-semibold ${ingreso ? 'text-income' : 'text-ink'}`}>
        {ingreso ? '+' : '−'} {dinero(m.monto, moneda)}
      </span>
    </button>
  );
}
