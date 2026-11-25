import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dinero, mesCorto, mesLargo } from '../lib/format';

type Punto = { mes: string; ingresos: number; gastos: number; balance: number };

function Globo({ active, payload, moneda }: any) {
  if (!active || !payload?.length) return null;
  const p: Punto = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{mesLargo(p.mes)}</p>
      <p className="tabular flex items-center gap-2"><span className="size-2 rounded-full bg-income" />Ingresos <b className="ml-auto pl-3">{dinero(p.ingresos, moneda)}</b></p>
      <p className="tabular flex items-center gap-2"><span className="size-2 rounded-full bg-expense" />Gastos <b className="ml-auto pl-3">{dinero(p.gastos, moneda)}</b></p>
      <p className="tabular mt-1 flex border-t border-line pt-1 text-ink-2">Balance <b className={`ml-auto pl-3 ${p.balance < 0 ? 'text-danger' : 'text-ink'}`}>{dinero(p.balance, moneda)}</b></p>
    </div>
  );
}

export function GraficoTendencia({ datos, moneda }: { datos: Punto[]; moneda: string }) {
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-ink-2" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-income" />Ingresos</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-expense" />Gastos</span>
      </div>
      <div className="h-48" role="img" aria-label="Ingresos y gastos de los últimos 6 meses">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="mes" tickFormatter={mesCorto} tickLine={false} axisLine={{ stroke: 'var(--line)' }} tick={{ fill: 'var(--ink-2)', fontSize: 12 }} />
            <YAxis width={52} tickFormatter={(v) => dinero(v, moneda, true)} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-2)', fontSize: 11 }} />
            <Tooltip content={<Globo moneda={moneda} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="ingresos" name="Ingresos" fill="var(--income)" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="gastos" name="Gastos" fill="var(--expense)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
