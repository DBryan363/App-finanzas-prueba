import { useEffect, useRef, useState } from 'react';
import { Home, List, Loader2, Plus, Settings, X } from 'lucide-react';
import { Movimiento, Tipo } from './api/types';
import { Bloqueo } from './components/Bloqueo';
import { FormMovimiento } from './components/FormMovimiento';
import { dinero, dineroOculto, mesActual, mesLargo } from './lib/format';
import { actualizarWidget, escucharAccesos, escucharPausa } from './lib/nativo';
import { aplicarPrivacidad, autenticandoAhora, bloqueoActivo, leerSeguridad, minutosRebloqueo, useSeguridad } from './lib/seguridad';
import { delMes, totales } from './lib/stats';
import { useFinanzas } from './lib/store';
import { Ajustes } from './pages/Ajustes';
import { Conectar } from './pages/Conectar';
import { Movimientos } from './pages/Movimientos';
import { Resumen } from './pages/Resumen';

type Pestana = 'resumen' | 'movimientos' | 'ajustes';
type Acceso = { tipo?: Tipo; voz?: boolean };
type Form = { abierto: boolean; mov: Movimiento | null; tipo?: Tipo; voz?: boolean };
const CERRADO: Form = { abierto: false, mov: null };

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
  const [form, setForm] = useState<Form>(CERRADO);
  useTema(datos?.config.tema);

  // Bloqueo con huella (solo APK). Mientras está bloqueada solo se puede registrar (si se permite).
  const seguridad = useSeguridad();
  const [bloqueado, setBloqueado] = useState(bloqueoActivo);
  /** Acceso del widget que espera al desbloqueo (cuando no se permite registrar sin desbloquear). */
  const [pendiente, setPendiente] = useState<Acceso | null>(null);
  const pausa = useRef(0);
  useEffect(aplicarPrivacidad, []);

  // Accesos directos (widget / atajos) y botón atrás de Android
  const estado = useRef({ form, pestana, bloqueado });
  estado.current = { form, pestana, bloqueado };
  useEffect(
    () =>
      escucharAccesos(
        (a) => {
          if (!estado.current.bloqueado || leerSeguridad().rapido) setForm({ abierto: true, mov: null, tipo: a.tipo, voz: a.voz });
          else setPendiente(a);
        },
        () => {
          if (estado.current.form.abierto) { setForm(CERRADO); return true; }
          if (estado.current.bloqueado) return false;
          if (estado.current.pestana !== 'resumen') { setPestana('resumen'); return true; }
          return false;
        },
      ),
    [],
  );

  // Vuelve a bloquear si la app estuvo en segundo plano más del tiempo elegido
  useEffect(
    () =>
      escucharPausa(
        () => { if (!autenticandoAhora()) pausa.current = Date.now(); },
        () => {
          const desde = pausa.current;
          pausa.current = 0;
          if (!desde || autenticandoAhora() || !bloqueoActivo() || estado.current.bloqueado) return;
          if (Date.now() - desde < minutosRebloqueo() * 60_000) return;
          setBloqueado(true);
          // Un registro nuevo puede seguir (registro rápido); editar uno existente, no
          setForm((f) => (f.mov || !leerSeguridad().rapido ? CERRADO : f));
        },
      ),
    [],
  );

  const desbloquear = () => {
    setBloqueado(false);
    if (pendiente) { setForm({ abierto: true, mov: null, ...pendiente }); setPendiente(null); }
  };

  // Mantiene el widget de Android al día con el mes actual
  useEffect(() => {
    if (!datos) return;
    const mes = mesActual();
    const t = totales(delMes(datos.movimientos, mes));
    const m = datos.config.moneda;
    // Con el balance oculto, el widget tampoco muestra ingresos ni gastos (con ellos se podría calcular)
    const ver = (n: number) => (datos.config.ocultarBalance === 'si' ? dineroOculto(m) : dinero(n, m));
    actualizarWidget({ mes: mesLargo(mes).split(' ')[0], balance: ver(t.balance), ingresos: ver(t.ingresos), gastos: ver(t.gastos) });
  }, [datos]);

  if (!conexion) return <Conectar />;

  if (bloqueado) {
    return (
      <>
        <Bloqueo
          pedirAlAbrir={!form.abierto}
          rapido={seguridad.rapido && !!datos}
          onDesbloquear={desbloquear}
          onRegistrar={(a) => setForm({ abierto: true, mov: null, ...a })}
        />
        <FormMovimiento abierta={form.abierto && !!datos} tipoInicial={form.tipo} conVoz={form.voz} rapido onCerrar={() => setForm(CERRADO)} />
      </>
    );
  }

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

      <FormMovimiento abierta={form.abierto} editar={form.mov} tipoInicial={form.tipo} conVoz={form.voz} onCerrar={() => setForm(CERRADO)} />
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
