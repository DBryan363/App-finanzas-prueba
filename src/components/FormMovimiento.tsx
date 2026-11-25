import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Movimiento, Tipo } from '../api/types';
import { hoyISO, uid } from '../lib/format';
import { useFinanzas } from '../lib/store';
import { Hoja } from './Hoja';

interface Props { abierta: boolean; editar?: Movimiento | null; tipoInicial?: Tipo; onCerrar(): void }

export function FormMovimiento({ abierta, editar, tipoInicial = 'gasto', onCerrar }: Props) {
  const { datos, guardarMovimiento, borrarMovimiento } = useFinanzas();
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [nota, setNota] = useState('');
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    if (!abierta) return;
    setTipo(editar?.tipo ?? tipoInicial);
    setMonto(editar ? String(editar.monto) : '');
    setCategoria(editar?.categoria ?? '');
    setFecha(editar?.fecha ?? hoyISO());
    setNota(editar?.nota ?? '');
    setConfirmar(false);
  }, [abierta, editar, tipoInicial]);

  const cats = (datos?.categorias ?? []).filter((c) => c.tipo === tipo);
  const valor = Number(monto.replace(',', '.'));
  const valido = valor > 0 && categoria && fecha;

  const guardar = () => {
    if (!valido) return;
    guardarMovimiento(
      { id: editar?.id ?? uid(), tipo, monto: Math.round(valor * 100) / 100, categoria, fecha, nota: nota.trim(), creado: editar?.creado ?? new Date().toISOString() },
      !editar,
    );
    onCerrar();
  };

  return (
    <Hoja abierta={abierta} titulo={editar ? 'Editar movimiento' : 'Nuevo movimiento'} onCerrar={onCerrar}>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(['gasto', 'ingreso'] as Tipo[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTipo(t); if (t !== tipo) setCategoria(''); }}
            className={`rounded-lg py-2 text-sm font-semibold capitalize transition ${tipo === t ? 'bg-surface shadow-sm ' + (t === 'ingreso' ? 'text-income' : 'text-expense') : 'text-ink-2'}`}
          >
            {t === 'gasto' ? 'Gasto' : 'Ingreso'}
          </button>
        ))}
      </div>

      <label className="mb-5 block text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-2">Monto</span>
        <div className="mt-1 flex items-baseline justify-center gap-2">
          <span className="text-2xl font-semibold text-ink-2">{datos?.config.moneda === 'PEN' ? 'S/' : datos?.config.moneda}</span>
          <input
            autoFocus={!editar}
            inputMode="decimal"
            placeholder="0.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ''))}
            style={{ width: `${Math.max(monto.length, 4) + 0.6}ch` }}
            className="tabular max-w-[70vw] bg-transparent text-center text-4xl font-bold outline-none placeholder:text-line"
          />
        </div>
      </label>

      <p className="mb-2 text-sm font-medium text-ink-2">Categoría</p>
      <div className="mb-5 grid grid-cols-4 gap-2">
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoria(c.id)}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition ${categoria === c.id ? 'border-ink bg-surface-2 font-semibold' : 'border-line'}`}
          >
            <span className="text-xl">{c.icono}</span>
            <span className="line-clamp-1">{c.nombre}</span>
          </button>
        ))}
        {!cats.length && <p className="col-span-4 text-sm text-ink-2">Crea categorías de {tipo} en Ajustes.</p>}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-2">Fecha</span>
          <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-2">Nota</span>
          <input className="input" placeholder="Opcional" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={80} />
        </label>
      </div>

      <div className="flex gap-2">
        {editar && (
          confirmar ? (
            <button className="btn bg-danger text-white" onClick={() => { borrarMovimiento(editar.id); onCerrar(); }}>Confirmar</button>
          ) : (
            <button className="btn btn-ghost text-danger" onClick={() => setConfirmar(true)} aria-label="Borrar"><Trash2 size={18} /></button>
          )
        )}
        <button className="btn btn-primary flex-1" disabled={!valido} onClick={guardar}>
          {editar ? 'Guardar cambios' : 'Guardar'}
        </button>
      </div>
    </Hoja>
  );
}
