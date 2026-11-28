import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Lock, Mic, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Categoria, Movimiento, Tipo } from '../api/types';
import { dinero, fechaLegible, hoyISO, uid } from '../lib/format';
import { aprender, Interpretacion, interpretarVarios, leerAprendidas } from '../lib/interpretar';
import { Escucha, escuchar, vozDisponible } from '../lib/voz';
import { useFinanzas } from '../lib/store';
import { Hoja } from './Hoja';

interface Props {
  abierta: boolean; editar?: Movimiento | null; tipoInicial?: Tipo; conVoz?: boolean;
  /** Abierto con la app bloqueada: solo se puede registrar. */
  rapido?: boolean;
  onCerrar(): void;
}

/** Un movimiento del formulario, todavía sin guardar. */
interface Borrador {
  key: string;
  tipo: Tipo;
  monto: string;
  categoria: string;
  fecha: string;
  nota: string;
  /** Lo que entendió el dictado, para aprender si el usuario corrige la categoría. */
  interp: Interpretacion | null;
}

const vacio = (tipo: Tipo, fecha = hoyISO()): Borrador => ({ key: uid(), tipo, monto: '', categoria: '', fecha, nota: '', interp: null });
const valor = (b: Borrador) => Number(b.monto.replace(',', '.'));
const completo = (b: Borrador) => valor(b) > 0 && !!b.categoria && !!b.fecha;

export function FormMovimiento({ abierta, editar, tipoInicial = 'gasto', conVoz = false, rapido = false, onCerrar }: Props) {
  const { datos, guardarMovimiento, agregarMovimientos, borrarMovimiento, guardarConfig } = useFinanzas();
  const [lista, setLista] = useState<{ items: Borrador[]; activo: number }>({ items: [vacio(tipoInicial)], activo: 0 });
  const [confirmar, setConfirmar] = useState(false);
  // Dictado por voz
  const [escuchando, setEscuchando] = useState(false);
  const [dictado, setDictado] = useState('');
  const [avisoVoz, setAvisoVoz] = useState('');
  const [entendido, setEntendido] = useState<Interpretacion[]>([]);
  const escucha = useRef<Escucha | null>(null);

  useEffect(() => {
    if (!abierta) return;
    setLista({
      items: [editar
        ? { key: editar.id, tipo: editar.tipo, monto: String(editar.monto), categoria: editar.categoria, fecha: editar.fecha, nota: editar.nota, interp: null }
        : vacio(tipoInicial)],
      activo: 0,
    });
    setConfirmar(false);
    setDictado(''); setAvisoVoz(''); setEntendido([]);
    if (conVoz && !editar) setTimeout(dictar, 250);
    return () => escucha.current?.detener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, editar, tipoInicial, conVoz]);

  const { items, activo } = lista;
  const actual = items[activo] ?? items[0];
  const varios = items.length > 1;
  const aprendidas = leerAprendidas(datos?.config.palabras);
  const moneda = datos?.config.moneda;
  const catDe = (id: string) => datos?.categorias.find((c) => c.id === id);

  const cambiar = (cambios: Partial<Borrador>) =>
    setLista((l) => ({ ...l, items: l.items.map((b, i) => (i === l.activo ? { ...b, ...cambios } : b)) }));

  const anadir = () =>
    setLista((l) => {
      const ref = l.items[l.activo];
      return { items: [...l.items, vacio(ref.tipo, ref.fecha)], activo: l.items.length };
    });

  const quitar = (i: number) =>
    setLista((l) => {
      if (l.items.length < 2) return l;
      const items = l.items.filter((_, k) => k !== i);
      const activo = i < l.activo ? l.activo - 1 : Math.min(l.activo, items.length - 1);
      return { items, activo };
    });

  /** Pone lo dictado en el formulario: rellena el movimiento abierto si está vacío y añade el resto. */
  function aplicar(texto: string) {
    if (!datos) return;
    const rs = interpretarVarios(texto, datos.categorias, aprendidas);
    setEntendido(rs);
    setLista((l) => {
      const base = l.items[l.activo];
      const enBlanco = !base.monto && !base.categoria;
      const nuevos = rs.map((r, i): Borrador => ({
        key: i === 0 && enBlanco ? base.key : uid(),
        tipo: r.tipo ?? base.tipo,
        monto: r.monto ? r.monto.toFixed(2) : '',
        categoria: r.categoria ?? '',
        fecha: r.fecha ?? base.fecha,
        nota: r.nota || (i === 0 && enBlanco ? base.nota : ''),
        interp: r,
      }));
      const items = enBlanco ? [...l.items.slice(0, l.activo), ...nuevos, ...l.items.slice(l.activo + 1)] : [...l.items, ...nuevos];
      const desde = enBlanco ? l.activo : l.items.length;
      const pendiente = nuevos.findIndex((b) => !completo(b));
      return { items, activo: desde + (pendiente >= 0 ? pendiente : nuevos.length - 1) };
    });
    if (rs.some((r) => !r.monto)) setAvisoVoz(rs.length > 1 ? 'En alguno no entendí el monto: revisa los marcados.' : 'No entendí el monto. Escríbelo o vuelve a dictar.');
    else if (rs.length === 1 && !rs[0].categoria) setAvisoVoz('Elige la categoría: la recordaré para la próxima vez.');
    else setAvisoVoz('');
  }

  function dictar() {
    if (escuchando) { escucha.current?.detener(); return; }
    setAvisoVoz(''); setDictado(''); setEscuchando(true);
    escucha.current = escuchar({
      parcial: (t) => setDictado(t),
      final: (t) => { setDictado(t); aplicar(t); },
      error: (m) => setAvisoVoz(m),
      fin: () => setEscuchando(false),
    });
    if (!escucha.current) setEscuchando(false);
  }

  const incompletos = items.filter((b) => !completo(b));
  const sinMonto = items.filter((b) => !(valor(b) > 0)).length;
  const sinCategoria = items.filter((b) => !b.categoria).length;
  const totalTipo = (t: Tipo) => items.reduce((s, b) => s + (b.tipo === t && valor(b) > 0 ? valor(b) : 0), 0);

  const textoBoton = editar
    ? 'Guardar cambios'
    : !varios ? 'Guardar'
    : !incompletos.length ? `Guardar ${items.length} movimientos`
    : sinMonto ? `Falta ${sinMonto} monto${sinMonto > 1 ? 's' : ''}`
    : `Falta ${sinCategoria} categoría${sinCategoria > 1 ? 's' : ''}`;

  const guardar = () => {
    if (incompletos.length || !datos) return;
    const ahora = Date.now();
    const movs: Movimiento[] = items.map((b, i) => ({
      id: editar?.id ?? uid(),
      tipo: b.tipo,
      monto: Math.round(valor(b) * 100) / 100,
      categoria: b.categoria,
      fecha: b.fecha,
      nota: b.nota.trim(),
      // Un milisegundo de diferencia para conservar el orden en que se registraron
      creado: editar?.creado ?? new Date(ahora + i).toISOString(),
    }));
    if (editar) guardarMovimiento(movs[0], false);
    else if (movs.length === 1) guardarMovimiento(movs[0], true);
    else agregarMovimientos(movs);

    // Si la voz no acertó la categoría, aprende la palabra para la próxima vez
    let palabras = aprendidas, cambio = false;
    for (const b of items) {
      if (!b.interp?.concepto || b.interp.categoria === b.categoria) continue;
      const nuevo = aprender(palabras, b.categoria, b.interp.concepto);
      if (nuevo) { palabras = nuevo; cambio = true; }
    }
    if (cambio) guardarConfig({ ...datos.config, palabras: JSON.stringify(palabras) });
    onCerrar();
  };

  const titulo = editar ? 'Editar movimiento' : varios ? `Nuevos movimientos · ${items.length}` : 'Nuevo movimiento';

  return (
    <Hoja abierta={abierta} titulo={titulo} onCerrar={onCerrar}>
      {rapido && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-gold/15 px-3 py-2 text-xs font-semibold text-gold-ink">
          <Lock size={14} /> Registro rápido <span className="font-medium text-ink-2">· para ver tus datos, desbloquea</span>
        </p>
      )}
      <div className="mb-4 flex gap-2">
        <div className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {(['gasto', 'ingreso'] as Tipo[]).map((t) => (
            <button
              key={t}
              onClick={() => cambiar(t !== actual.tipo ? { tipo: t, categoria: '' } : {})}
              className={`rounded-lg py-2 text-sm font-semibold capitalize transition ${actual.tipo === t ? 'bg-surface shadow-sm ' + (t === 'ingreso' ? 'text-income' : 'text-expense') : 'text-ink-2'}`}
            >
              {t === 'gasto' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>
        {vozDisponible && !editar && (
          <button
            onClick={dictar}
            aria-label={escuchando ? 'Detener dictado' : 'Dictar con voz'}
            className={`relative grid w-12 shrink-0 place-items-center rounded-xl transition ${escuchando ? 'bg-expense text-white' : 'bg-hero text-gold'}`}
          >
            {escuchando && <span className="absolute inset-0 animate-ping rounded-xl bg-expense/40" />}
            <Mic size={20} className="relative" />
          </button>
        )}
      </div>

      {(escuchando || dictado || avisoVoz) && (
        <div className="mb-4 rounded-xl border border-line bg-surface-2 p-3 text-sm">
          {escuchando && !dictado && <p className="text-ink-2">Escuchando… di por ejemplo «gasté 25 soles en almuerzo y 10 en taxi»</p>}
          {dictado && <p className="italic">«{dictado}»</p>}
          {!escuchando && entendido.length > 1 && (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-ink-2">
              <Sparkles size={13} className="text-gold-ink" /> <b className="text-gold-ink">Entendí {entendido.length} movimientos</b> · toca el micrófono para añadir más
            </p>
          )}
          {!escuchando && entendido.length === 1 && entendido[0].monto && (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-ink-2">
              <Sparkles size={13} className="text-gold-ink" /> Entendí: {entendido[0].tipo === 'ingreso' ? 'Ingreso' : 'Gasto'} · {dinero(entendido[0].monto, moneda)}
              {entendido[0].categoria && <> · {catDe(entendido[0].categoria)?.nombre}</>}
              {entendido[0].fecha && <> · {fechaLegible(entendido[0].fecha)}</>}
            </p>
          )}
          {avisoVoz && <p className="mt-1 text-xs font-medium text-expense">{avisoVoz}</p>}
        </div>
      )}

      <div className="space-y-2">
        {items.map((b, i) =>
          i === activo ? (
            <Detalle
              key={b.key}
              b={b}
              numero={varios ? i + 1 : 0}
              categorias={(datos?.categorias ?? []).filter((c) => c.tipo === b.tipo)}
              moneda={moneda}
              enfocar={!editar && !conVoz && !b.monto}
              onCambio={cambiar}
              onQuitar={varios ? () => quitar(i) : undefined}
            />
          ) : (
            <Fila key={b.key} b={b} cat={catDe(b.categoria)} moneda={moneda} onAbrir={() => setLista((l) => ({ ...l, activo: i }))} onQuitar={() => quitar(i)} />
          ),
        )}
      </div>

      {!editar && (
        <button onClick={anadir} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-line py-3 text-sm font-semibold text-income">
          <Plus size={16} /> Añadir otro movimiento
        </button>
      )}

      <div className="sticky bottom-0 -mx-5 mt-4 bg-surface px-5 pt-2">
        {varios && (
          <div className="tabular mb-2 flex justify-between border-t border-line pt-2.5 text-sm text-ink-2">
            <span>Gastos <b className="text-ink">{dinero(totalTipo('gasto'), moneda)}</b></span>
            <span>Ingresos <b className="text-ink">{dinero(totalTipo('ingreso'), moneda)}</b></span>
          </div>
        )}
        <div className="flex gap-2">
          {editar && (
            confirmar ? (
              <button className="btn bg-danger text-white" onClick={() => { borrarMovimiento(editar.id); onCerrar(); }}>Confirmar</button>
            ) : (
              <button className="btn btn-ghost text-danger" onClick={() => setConfirmar(true)} aria-label="Borrar"><Trash2 size={18} /></button>
            )
          )}
          <button className="btn btn-primary flex-1" disabled={incompletos.length > 0} onClick={guardar}>{textoBoton}</button>
        </div>
      </div>
    </Hoja>
  );
}

/** Movimiento abierto: monto, categorías, fecha y nota. Si es el único, se ve como el formulario de siempre. */
function Detalle({ b, numero, categorias, moneda, enfocar, onCambio, onQuitar }: {
  b: Borrador; numero: number; categorias: Categoria[]; moneda?: string; enfocar: boolean;
  onCambio(c: Partial<Borrador>): void; onQuitar?(): void;
}) {
  const enLista = numero > 0;
  const falta = !!b.interp && !completo(b);
  return (
    <div className={enLista ? `rounded-2xl border-[1.5px] p-3 ${falta ? 'border-expense' : 'border-ink'}` : ''}>
      {enLista && (
        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink-2">
          <span className="truncate">Movimiento {numero}{b.nota ? ` · ${b.nota}` : ''}</span>
          {onQuitar && <button onClick={onQuitar} className="flex shrink-0 items-center gap-0.5 text-danger"><X size={13} /> Quitar</button>}
        </div>
      )}
      <label className={`block text-center ${enLista ? 'mb-3' : 'mb-5'}`}>
        {!enLista && <span className="text-xs font-medium uppercase tracking-wider text-ink-2">Monto</span>}
        <div className="mt-1 flex items-baseline justify-center gap-2">
          <span className={`font-semibold text-ink-2 ${enLista ? 'text-xl' : 'text-2xl'}`}>{moneda === 'PEN' ? 'S/' : moneda}</span>
          <input
            autoFocus={enfocar}
            inputMode="decimal"
            placeholder="0.00"
            value={b.monto}
            onChange={(e) => onCambio({ monto: e.target.value.replace(/[^\d.,]/g, '') })}
            style={{ width: `${Math.max(b.monto.length, 4) + 0.6}ch` }}
            className={`tabular max-w-[70vw] bg-transparent text-center font-bold outline-none placeholder:text-line ${enLista ? 'text-3xl' : 'text-4xl'}`}
          />
        </div>
      </label>

      {falta && enLista && !b.categoria && <p className="-mt-1 mb-2 text-center text-xs font-semibold text-expense">Elige la categoría: la recordaré para la próxima vez</p>}
      {!enLista && <p className="mb-2 text-sm font-medium text-ink-2">Categoría</p>}
      <div className={`grid grid-cols-4 gap-2 ${enLista ? 'mb-3' : 'mb-5'}`}>
        {categorias.map((c) => (
          <button
            key={c.id}
            onClick={() => onCambio({ categoria: c.id })}
            className={`flex flex-col items-center gap-1 rounded-xl border text-xs transition ${enLista ? 'p-1.5' : 'p-2'} ${b.categoria === c.id ? 'border-ink bg-surface-2 font-semibold' : 'border-line'}`}
          >
            <span className={enLista ? 'text-lg' : 'text-xl'}>{c.icono}</span>
            <span className="line-clamp-1">{c.nombre}</span>
          </button>
        ))}
        {!categorias.length && <p className="col-span-4 text-sm text-ink-2">Crea categorías de {b.tipo} en Ajustes.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-2">Fecha</span>
          <input type="date" className="input" value={b.fecha} onChange={(e) => onCambio({ fecha: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-2">Nota</span>
          <input className="input" placeholder="Opcional" value={b.nota} onChange={(e) => onCambio({ nota: e.target.value })} maxLength={80} />
        </label>
      </div>
    </div>
  );
}

/** Movimiento compacto en la lista; al tocarlo se abre. */
function Fila({ b, cat, moneda, onAbrir, onQuitar }: { b: Borrador; cat?: Categoria; moneda?: string; onAbrir(): void; onQuitar(): void }) {
  const ok = completo(b);
  const Icono = b.tipo === 'ingreso' ? ArrowUpRight : ArrowDownRight;
  return (
    <div className={`flex items-center gap-2.5 rounded-2xl border p-2.5 ${ok ? 'border-line' : 'border-expense bg-expense/5'}`}>
      <button onClick={onAbrir} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${b.tipo === 'ingreso' ? 'bg-income/15 text-income' : 'bg-expense/15 text-expense'}`}>
          <Icono size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <b className={`block truncate text-sm font-semibold ${b.categoria ? '' : 'text-expense'}`}>
            {cat ? `${cat.icono} ${cat.nombre}` : 'Elige categoría'}
          </b>
          <small className="block truncate text-xs text-ink-2">{[b.nota, fechaLegible(b.fecha)].filter(Boolean).join(' · ')}</small>
        </span>
        <span className={`tabular text-[15px] font-bold ${valor(b) > 0 ? '' : 'text-expense'}`}>{valor(b) > 0 ? dinero(valor(b), moneda) : 'Sin monto'}</span>
      </button>
      <button onClick={onQuitar} className="p-1 text-ink-2" aria-label="Quitar"><X size={16} /></button>
    </div>
  );
}
