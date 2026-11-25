import { useEffect, useState } from 'react';
import { ExternalLink, LogOut, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { AlmacenDemo } from '../api/demo';
import { Categoria, Config, Tipo } from '../api/types';
import { Hoja } from '../components/Hoja';
import { MONEDAS, uid } from '../lib/format';
import { leerAprendidas, normalizar, PALABRAS_BASE } from '../lib/interpretar';
import { useFinanzas } from '../lib/store';

const COLORES = ['#1F6FB2', '#0F7B8A', '#C8742B', '#6A4CE2', '#D4A017', '#B23A48', '#1E7F4F', '#5B6B8C'];
const ICONOS = ['💼', '💻', '✨', '📈', '🎁', '🍽️', '🛒', '🚌', '🚗', '🏠', '💡', '📱', '🩺', '🎓', '🎬', '👕', '✈️', '🐾', '💳', '📦'];

export function Ajustes() {
  const { datos, conexion, guardarConfig, guardarCategorias, desconectar, recargar, cargando } = useFinanzas();
  const [cfg, setCfg] = useState<Config | null>(datos?.config ?? null);
  const [editCat, setEditCat] = useState<Categoria | null>(null);
  const [tipoCat, setTipoCat] = useState<Tipo>('gasto');
  useEffect(() => { if (datos) setCfg(datos.config); }, [datos?.config]);
  if (!datos || !cfg) return null;

  const cambiar = (k: keyof Config, v: string | number) => setCfg({ ...cfg, [k]: v });
  const sinGuardar = JSON.stringify(cfg) !== JSON.stringify(datos.config);
  const cats = datos.categorias.filter((c) => c.tipo === tipoCat);

  const aprendidas = leerAprendidas(datos.config.palabras);
  const guardarCat = (c: Categoria, palabras: string) => {
    const existe = datos.categorias.some((x) => x.id === c.id);
    guardarCategorias(existe ? datos.categorias.map((x) => (x.id === c.id ? c : x)) : [...datos.categorias, c]);
    const limpias = palabras.split(',').map((x) => normalizar(x)).filter(Boolean).join(', ');
    if (limpias !== (aprendidas[c.id] ?? '')) {
      guardarConfig({ ...datos.config, palabras: JSON.stringify({ ...aprendidas, [c.id]: limpias }) });
    }
    setEditCat(null);
  };
  const borrarCat = (id: string) => {
    guardarCategorias(datos.categorias.filter((x) => x.id !== id));
    setEditCat(null);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Ajustes</h1>

      <section className="card space-y-4 p-4">
        <h2 className="text-sm font-semibold">Perfil y preferencias</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-2">Tu nombre</span>
          <input className="input" value={cfg.nombre} onChange={(e) => cambiar('nombre', e.target.value)} placeholder="¿Cómo te llamamos?" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-2">Moneda</span>
          <select className="input" value={cfg.moneda} onChange={(e) => cambiar('moneda', e.target.value)}>
            {MONEDAS.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-2">Meta de ahorro mensual</span>
          <input className="input tabular" inputMode="decimal" value={cfg.metaAhorro} onChange={(e) => cambiar('metaAhorro', Number(e.target.value.replace(/[^\d.]/g, '')) || 0)} />
        </label>
        <div className="text-sm">
          <span className="mb-1 block text-ink-2">Tema</span>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
            {(['sistema', 'claro', 'oscuro'] as const).map((t) => (
              <button key={t} onClick={() => cambiar('tema', t)} className={`rounded-lg py-1.5 font-medium capitalize ${cfg.tema === t ? 'bg-surface shadow-sm' : 'text-ink-2'}`}>{t}</button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary w-full" disabled={!sinGuardar} onClick={() => guardarConfig(cfg)}>
          {sinGuardar ? 'Guardar preferencias' : 'Preferencias guardadas'}
        </button>
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Categorías</h2>
          <button
            className="flex items-center gap-1 text-sm font-medium text-income"
            onClick={() => setEditCat({ id: uid(), nombre: '', tipo: tipoCat, icono: tipoCat === 'gasto' ? '📦' : '✨', color: COLORES[0], presupuesto: '' })}
          >
            <Plus size={16} /> Nueva
          </button>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 text-sm">
          {(['gasto', 'ingreso'] as Tipo[]).map((t) => (
            <button key={t} onClick={() => setTipoCat(t)} className={`rounded-lg py-1.5 font-medium ${tipoCat === t ? 'bg-surface shadow-sm' : 'text-ink-2'}`}>{t === 'gasto' ? 'Gastos' : 'Ingresos'}</button>
          ))}
        </div>
        <ul className="divide-y divide-line">
          {cats.map((c) => (
            <li key={c.id}>
              <button onClick={() => setEditCat(c)} className="flex w-full items-center gap-3 py-2.5 text-left">
                <span className="grid size-9 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${c.color} 16%, transparent)` }}>{c.icono}</span>
                <span className="flex-1 font-medium">{c.nombre}</span>
                {c.presupuesto !== '' && <span className="tabular text-xs text-ink-2">Tope {c.presupuesto}</span>}
                <Pencil size={15} className="text-ink-2" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">Conexión</h2>
        {conexion?.modo === 'demo' ? (
          <p className="text-sm text-ink-2">Estás en <b>modo demo</b>: los datos se guardan solo en este dispositivo.</p>
        ) : (
          <p className="text-sm text-ink-2">Conectado a tu Google Sheets{datos.nombreHoja ? <> «<b>{datos.nombreHoja}</b>»</> : ''}.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {datos.urlHoja && (
            <a className="btn btn-ghost text-sm" href={datos.urlHoja} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir hoja</a>
          )}
          <button className="btn btn-ghost text-sm" onClick={recargar} disabled={cargando}><RefreshCw size={16} className={cargando ? 'animate-spin' : ''} /> Sincronizar</button>
          {conexion?.modo === 'demo' && (
            <button className="btn btn-ghost text-sm" onClick={() => { AlmacenDemo.reiniciar(); recargar(); }}>Reiniciar demo</button>
          )}
          <button className="btn btn-ghost text-sm text-danger" onClick={desconectar}><LogOut size={16} /> {conexion?.modo === 'demo' ? 'Salir del demo' : 'Desconectar'}</button>
        </div>
      </section>

      <EditorCategoria cat={editCat} palabras={editCat ? aprendidas[editCat.id] ?? '' : ''} onCerrar={() => setEditCat(null)} onGuardar={guardarCat} onBorrar={borrarCat}
        existe={!!editCat && datos.categorias.some((x) => x.id === editCat.id)}
        enUso={!!editCat && datos.movimientos.some((m) => m.categoria === editCat.id)} />
    </div>
  );
}

function EditorCategoria({ cat, palabras, existe, enUso, onCerrar, onGuardar, onBorrar }: {
  cat: Categoria | null; palabras: string; existe: boolean; enUso: boolean; onCerrar(): void; onGuardar(c: Categoria, palabras: string): void; onBorrar(id: string): void;
}) {
  const [c, setC] = useState<Categoria | null>(cat);
  const [pal, setPal] = useState(palabras);
  useEffect(() => { setC(cat); setPal(palabras); }, [cat, palabras]);
  if (!c) return null;
  const base = Object.entries(PALABRAS_BASE).find(([k]) => normalizar(c.nombre).includes(k))?.[1] ?? [];
  return (
    <Hoja abierta={!!cat} titulo={existe ? 'Editar categoría' : 'Nueva categoría'} onCerrar={onCerrar}>
      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-ink-2">Nombre</span>
          <input className="input" autoFocus value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} maxLength={24} />
        </label>
        <div className="text-sm">
          <span className="mb-1 block text-ink-2">Icono</span>
          <div className="grid grid-cols-10 gap-1">
            {ICONOS.map((i) => (
              <button key={i} onClick={() => setC({ ...c, icono: i })} className={`aspect-square rounded-lg text-lg ${c.icono === i ? 'bg-surface-2 ring-2 ring-ink' : ''}`}>{i}</button>
            ))}
          </div>
        </div>
        <div className="text-sm">
          <span className="mb-1 block text-ink-2">Color</span>
          <div className="flex gap-2">
            {COLORES.map((col) => (
              <button key={col} onClick={() => setC({ ...c, color: col })} aria-label={col}
                className={`size-8 rounded-full ${c.color === col ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`} style={{ background: col }} />
            ))}
          </div>
        </div>
        {c.tipo === 'gasto' && (
          <label className="block text-sm">
            <span className="mb-1 block text-ink-2">Presupuesto mensual (opcional)</span>
            <input className="input tabular" inputMode="decimal" placeholder="Sin tope" value={c.presupuesto}
              onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ''); setC({ ...c, presupuesto: v === '' ? '' : Number(v) }); }} />
          </label>
        )}
        <label className="block text-sm">
          <span className="mb-1 block text-ink-2">Palabras para el dictado por voz</span>
          <textarea className="input min-h-20" placeholder="Ej.: pasaje, combi, taxi" value={pal} onChange={(e) => setPal(e.target.value)} />
          <span className="mt-1 block text-xs text-ink-2">
            Sepáralas con comas. La app también aprende sola cuando corriges una categoría.
            {base.length > 0 && <> Ya reconoce: {base.slice(0, 8).join(', ')}…</>}
          </span>
        </label>
        <div className="flex gap-2">
          {existe && (
            <button className="btn btn-ghost text-danger" disabled={enUso} title={enUso ? 'Tiene movimientos asociados' : 'Borrar'} onClick={() => onBorrar(c.id)}><Trash2 size={18} /></button>
          )}
          <button className="btn btn-primary flex-1" disabled={!c.nombre.trim()} onClick={() => onGuardar({ ...c, nombre: c.nombre.trim() }, pal)}>Guardar</button>
        </div>
        {existe && enUso && <p className="text-xs text-ink-2">No se puede borrar porque tiene movimientos registrados.</p>}
      </div>
    </Hoja>
  );
}
