import { useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Eye, EyeOff, Target } from 'lucide-react';
import { Movimiento } from '../api/types';
import { FilaMovimiento } from '../components/FilaMovimiento';
import { GraficoTendencia } from '../components/GraficoTendencia';
import { SelectorMes } from '../components/SelectorMes';
import { dinero, dineroOculto, moverMes } from '../lib/format';
import { delMes, porCategoria, tendencia, totales } from '../lib/stats';
import { useFinanzas } from '../lib/store';

interface Props { mes: string; setMes(m: string): void; onEditar(m: Movimiento): void; verTodos(): void }

export function Resumen({ mes, setMes, onEditar, verTodos }: Props) {
  const { datos } = useFinanzas();
  const [revelar, setRevelar] = useState(false);
  if (!datos) return null;
  const { config, categorias, movimientos } = datos;
  const moneda = config.moneda;
  const movsMes = delMes(movimientos, mes);
  const t = totales(movsMes);
  const tPrev = totales(delMes(movimientos, moverMes(mes, -1)));
  const cambioGasto = tPrev.gastos ? (t.gastos - tPrev.gastos) / tPrev.gastos : null;
  const gastosCat = porCategoria(movsMes, categorias, 'gasto');
  const meta = Number(config.metaAhorro) || 0;
  const avance = meta ? Math.max(0, Math.min(1, t.balance / meta)) : 0;
  const ultimos = [...movsMes].sort((a, b) => (b.fecha + b.creado).localeCompare(a.fecha + a.creado)).slice(0, 5);
  const catDe = (id: string) => categorias.find((c) => c.id === id);
  // Modo privado: balance, ingresos y gastos se ven como «S/ ***» hasta tocar el ojo
  const oculto = config.ocultarBalance === 'si' && !revelar;
  const ver = (n: number) => (oculto ? dineroOculto(moneda) : dinero(n, moneda));

  return (
    <div className="space-y-4">
      {/* Tarjeta principal */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-hero to-hero-2 p-5 text-white shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-white/70">{config.nombre ? `Hola, ${config.nombre}` : 'Tu resumen'}</p>
          <SelectorMes mes={mes} onCambio={setMes} claro />
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-gold">Balance del mes</p>
        {config.ocultarBalance === 'si' ? (
          <button onClick={() => setRevelar(!revelar)} className="mt-1 flex items-center gap-3 text-left" aria-label={revelar ? 'Ocultar montos' : 'Mostrar montos'}>
            <span className="tabular text-4xl font-bold tracking-tight">{ver(t.balance)}</span>
            {revelar ? <EyeOff size={20} className="text-white/60" /> : <Eye size={20} className="text-white/60" />}
          </button>
        ) : (
          <p className="tabular mt-1 text-4xl font-bold tracking-tight">{dinero(t.balance, moneda)}</p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/8 p-3">
            <p className="flex items-center gap-1 text-xs text-white/70"><ArrowUpRight size={14} /> Ingresos</p>
            <p className="tabular mt-1 text-lg font-semibold">{ver(t.ingresos)}</p>
          </div>
          <div className="rounded-2xl bg-white/8 p-3">
            <p className="flex items-center gap-1 text-xs text-white/70"><ArrowDownRight size={14} /> Gastos</p>
            <p className="tabular mt-1 text-lg font-semibold">{ver(t.gastos)}</p>
            {cambioGasto !== null && (
              <p className="mt-0.5 text-[11px] text-white/60">
                {cambioGasto > 0 ? '▲' : '▼'} {Math.abs(cambioGasto * 100).toFixed(0)}% vs mes anterior
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Meta de ahorro */}
      {meta > 0 && (
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold"><Target size={16} className="text-gold-ink" /> Meta de ahorro</p>
            <p className="tabular text-sm text-ink-2">{Math.round(avance * 100)}%</p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${avance * 100}%` }} />
          </div>
          <p className="tabular mt-2 text-xs text-ink-2">
            {t.balance >= meta ? '¡Meta cumplida! ' : ''}Ahorrado {ver(Math.max(t.balance, 0))} de {dinero(meta, moneda)}
          </p>
        </section>
      )}

      {/* Tendencia */}
      <section className="card p-4">
        <h3 className="mb-3 text-sm font-semibold">Últimos 6 meses</h3>
        <GraficoTendencia datos={tendencia(movimientos, mes)} moneda={moneda} />
      </section>

      {/* Gastos por categoría */}
      <section className="card p-4">
        <h3 className="mb-3 text-sm font-semibold">Gastos por categoría</h3>
        {!gastosCat.length && <p className="text-sm text-ink-2">Aún no hay gastos este mes.</p>}
        <ul className="space-y-3.5">
          {gastosCat.map((c) => {
            const tope = typeof c.presupuesto === 'number' && c.presupuesto > 0 ? c.presupuesto : null;
            const uso = tope ? c.monto / tope : c.pct;
            const excedido = tope !== null && c.monto > tope;
            return (
              <li key={c.id}>
                <div className="mb-1.5 flex items-center gap-2 text-sm">
                  <span>{c.icono}</span>
                  <span className="flex-1 truncate font-medium">{c.nombre}</span>
                  <span className="tabular font-semibold">{dinero(c.monto, moneda)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className={`h-full rounded-full ${excedido ? 'bg-danger' : 'bg-expense'}`} style={{ width: `${Math.min(uso, 1) * 100}%` }} />
                </div>
                <p className="tabular mt-1 flex items-center gap-1 text-[11px] text-ink-2">
                  {tope ? (
                    excedido ? (
                      <span className="flex items-center gap-1 font-medium text-danger"><AlertTriangle size={12} /> Excedido por {dinero(c.monto - tope, moneda)} · presupuesto {dinero(tope, moneda)}</span>
                    ) : (
                      <>{Math.round(uso * 100)}% de {dinero(tope, moneda)} presupuestado</>
                    )
                  ) : (
                    <>{Math.round(c.pct * 100)}% del gasto del mes</>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Últimos movimientos */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="text-sm font-semibold">Últimos movimientos</h3>
          <button onClick={verTodos} className="text-sm font-medium text-income">Ver todos</button>
        </div>
        {!ultimos.length && <p className="px-4 pb-4 text-sm text-ink-2">Sin movimientos este mes. Toca + para agregar.</p>}
        <div className="divide-y divide-line pb-1">
          {ultimos.map((m) => <FilaMovimiento key={m.id} m={m} cat={catDe(m.categoria)} moneda={moneda} onClick={() => onEditar(m)} />)}
        </div>
      </section>
    </div>
  );
}
