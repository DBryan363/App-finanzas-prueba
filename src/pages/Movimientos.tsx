import { useState } from 'react';
import { Search } from 'lucide-react';
import { Movimiento } from '../api/types';
import { FilaMovimiento } from '../components/FilaMovimiento';
import { SelectorMes } from '../components/SelectorMes';
import { dinero, fechaLegible } from '../lib/format';
import { delMes, totales } from '../lib/stats';
import { useFinanzas } from '../lib/store';

type Filtro = 'todos' | 'ingreso' | 'gasto';

export function Movimientos({ mes, setMes, onEditar }: { mes: string; setMes(m: string): void; onEditar(m: Movimiento): void }) {
  const { datos } = useFinanzas();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  if (!datos) return null;
  const { categorias, config } = datos;
  const catDe = (id: string) => categorias.find((c) => c.id === id);
  const q = busca.trim().toLowerCase();

  const lista = delMes(datos.movimientos, mes)
    .filter((m) => filtro === 'todos' || m.tipo === filtro)
    .filter((m) => !q || m.nota.toLowerCase().includes(q) || (catDe(m.categoria)?.nombre ?? '').toLowerCase().includes(q))
    .sort((a, b) => (b.fecha + b.creado).localeCompare(a.fecha + a.creado));

  const grupos = new Map<string, Movimiento[]>();
  lista.forEach((m) => grupos.set(m.fecha, [...(grupos.get(m.fecha) ?? []), m]));
  const t = totales(lista);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Movimientos</h1>
        <SelectorMes mes={mes} onCambio={setMes} />
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
        <input className="input pl-10" placeholder="Buscar por nota o categoría" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="flex gap-2">
        {(['todos', 'ingreso', 'gasto'] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${filtro === f ? 'border-hero bg-hero text-white' : 'border-line text-ink-2'}`}
          >
            {f === 'todos' ? 'Todos' : f === 'ingreso' ? 'Ingresos' : 'Gastos'}
          </button>
        ))}
      </div>

      <div className="tabular grid grid-cols-2 gap-3 text-sm">
        <div className="card px-4 py-3"><p className="text-xs text-ink-2">Ingresos</p><p className="font-semibold text-income">+ {dinero(t.ingresos, config.moneda)}</p></div>
        <div className="card px-4 py-3"><p className="text-xs text-ink-2">Gastos</p><p className="font-semibold">− {dinero(t.gastos, config.moneda)}</p></div>
      </div>

      {!lista.length && <p className="card p-6 text-center text-sm text-ink-2">No hay movimientos para mostrar.</p>}

      {[...grupos.entries()].map(([fecha, movs]) => {
        const dia = totales(movs);
        return (
          <section key={fecha} className="card overflow-hidden">
            <div className="flex justify-between border-b border-line bg-surface-2/60 px-4 py-2 text-xs font-medium text-ink-2">
              <span>{fechaLegible(fecha)}</span>
              <span className="tabular">{dinero(dia.balance, config.moneda)}</span>
            </div>
            <div className="divide-y divide-line">
              {movs.map((m) => <FilaMovimiento key={m.id} m={m} cat={catDe(m.categoria)} moneda={config.moneda} onClick={() => onEditar(m)} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
