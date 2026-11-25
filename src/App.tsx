import { useEffect, useRef, useState } from 'react';
import { Home, List, Loader2, Plus, Settings, X } from 'lucide-react';
import { Movimiento, Tipo } from './api/types';
import { FormMovimiento } from './components/FormMovimiento';
import { dinero, mesActual, mesLargo } from './lib/format';
import { actualizarWidget, escucharAccesos } from './lib/nativo';
import { delMes, totales } from './lib/stats';
import { useFinanzas } from './lib/store';
import { Ajustes } from './pages/Ajustes';
import { Conectar } from './pages/Conectar';
import { Movimientos } from './pages/Movimientos';
import { Resumen } from './pages/Resumen';

type Pestana = 'resumen' | 'movimientos' | 'ajustes';

function useTema(tema?: string) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const aplicar = () => {
      const oscuro = tema === 'oscuro' || ((!tema || tema === 'sistema') && mq.matches);
      document.documentElement.dataset.theme = oscuro ? 'dark' : 'light';
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', oscuro ? '#0A1220' : '#0B1F3A');
    };
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, [tema]);
}

export default function App() {
  const { conexion, datos, cargando, sincronizando, error, limpiarError } = useFinanzas();
  const [pestana, setPestana] = useState<Pestana>('resumen');
  const [mes, setMes] = useState(mesActual());
  const [form, setForm] = useState<{ abierto: boolean; mov: Movimiento | null; tipo?: Tipo }>({ abierto: false, mov: null });
  useTema(datos?.config.tema);

  // Accesos directos (widget / atajos) y botón atrás de Android
  const estado = useRef({ form, pestana });
  estado.current = { form, pestana };
  useEffect(
    () =>
      escucharAccesos(
        (tipo) => setForm({ abierto: true, mov: null, tipo }),
        () => {
          if (estado.current.form.abierto) { setForm({ abierto: false, mov: null }); return true; }
          if (estado.current.pestana !== 'resumen') { setPestana('resumen'); return true; }
          return false;
        },
      ),
    [],
  );

  // Mantiene el widget de Android al día con el mes actual
  useEffect(() => {
    if (!datos) return;
    const mes = mesActual();
    const t = totales(delMes(datos.movimientos, mes));
    const m = datos.config.moneda;
    actualizarWidget({ mes: mesLargo(mes).split(' ')[0], balance: dinero(t.balance, m), ingresos: dinero(t.ingresos, m), gastos: dinero(t.gastos, m) });
  }, [datos]);

  if (!conexion) return <Conectar />;

  if (!datos) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        {error ? (
          <div className="card max-w-sm p-5">
            <p className="mb-3 text-sm text-danger">{error}</p>
            <p className="text-xs text-ink-2">Revisa tu conexión o la URL del script en Ajustes.</p>
          </div>
        ) : (
          <Loader2 className="animate-spin text-ink-2" />
        )}
      </div>
    );
  }

  const editar = (m: Movimiento) => setForm({ abierto: true, mov: m });
  const nav = [
    { id: 'resumen', label: 'Resumen', Icon: Home },
    { id: 'movimientos', label: 'Movimientos', Icon: List },
    { id: 'ajustes', label: 'Ajustes', Icon: Settings },
  ] as const;

  return (
    <div className="mx-auto min-h-screen max-w-lg">
      {(sincronizando || cargando) && (
        <div className="fixed right-3 top-3 z-40 flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2 shadow">
          <Loader2 size={12} className="animate-spin" /> {cargando ? 'Cargando' : 'Guardando'}
        </div>
      )}
      {conexion.modo === 'demo' && (
        <div className="bg-gold/15 px-4 py-1.5 text-center text-xs font-medium text-gold-ink">Modo demo · datos de ejemplo</div>
      )}

      <main className="px-4 pb-32 pt-4">
        {pestana === 'resumen' && <Resumen mes={mes} setMes={setMes} onEditar={editar} verTodos={() => setPestana('movimientos')} />}
        {pestana === 'movimientos' && <Movimientos mes={mes} setMes={setMes} onEditar={editar} />}
        {pestana === 'ajustes' && <Ajustes />}
      </main>

      {error && (
        <div className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-md items-start gap-2 rounded-xl bg-danger p-3 text-sm text-white shadow-lg">
          <span className="flex-1">{error}</span>
          <button onClick={limpiarError} aria-label="Cerrar"><X size={18} /></button>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-safe backdrop-blur">
        <div className="relative mx-auto grid max-w-lg grid-cols-4 px-2 pt-1.5">
          {nav.slice(0, 2).map(({ id, label, Icon }) => (
            <BotonNav key={id} activo={pestana === id} label={label} Icon={Icon} onClick={() => setPestana(id)} />
          ))}
          <div className="flex justify-center">
            <button
              onClick={() => setForm({ abierto: true, mov: null })}
              className="-mt-6 grid size-14 place-items-center rounded-2xl bg-hero text-white shadow-lg ring-4 ring-bg active:scale-95"
              aria-label="Agregar movimiento"
            >
              <Plus size={26} className="text-gold" />
            </button>
          </div>
          {nav.slice(2).map(({ id, label, Icon }) => (
            <BotonNav key={id} activo={pestana === id} label={label} Icon={Icon} onClick={() => setPestana(id)} />
          ))}
        </div>
      </nav>

      <FormMovimiento abierta={form.abierto} editar={form.mov} tipoInicial={form.tipo} onCerrar={() => setForm({ abierto: false, mov: null })} />
    </div>
  );
}

function BotonNav({ activo, label, Icon, onClick }: { activo: boolean; label: string; Icon: typeof Home; onClick(): void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium ${activo ? 'text-ink' : 'text-ink-2'}`}>
      <Icon size={22} strokeWidth={activo ? 2.4 : 1.8} />
      {label}
    </button>
  );
}
