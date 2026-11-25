import { ChevronLeft, ChevronRight } from 'lucide-react';
import { mesActual, mesLargo, moverMes } from '../lib/format';

export function SelectorMes({ mes, onCambio, claro = false }: { mes: string; onCambio(m: string): void; claro?: boolean }) {
  const esActual = mes >= mesActual();
  const cls = claro ? 'text-white/80 hover:bg-white/10' : 'text-ink-2 hover:bg-surface-2';
  return (
    <div className="flex items-center gap-1">
      <button className={`rounded-full p-1.5 ${cls}`} onClick={() => onCambio(moverMes(mes, -1))} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
      <span className={`min-w-32 text-center text-sm font-medium ${claro ? 'text-white' : ''}`}>{mesLargo(mes)}</span>
      <button className={`rounded-full p-1.5 ${cls} disabled:opacity-30`} disabled={esActual} onClick={() => onCambio(moverMes(mes, 1))} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
    </div>
  );
}
