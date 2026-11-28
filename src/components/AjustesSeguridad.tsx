import { useState } from 'react';
import { Lock, Smartphone } from 'lucide-react';
import { autenticar, comprobarDispositivo, guardarSeguridad, Rebloqueo, seguridadDisponible, useSeguridad } from '../lib/seguridad';

function Interruptor({ activo, etiqueta, onCambio, desactivado }: { activo: boolean; etiqueta: string; onCambio(): void; desactivado?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      disabled={desactivado}
      onClick={onCambio}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${activo ? 'bg-hero' : 'bg-surface-2 ring-1 ring-line'}`}
    >
      <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${activo ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

function Opcion({ titulo, detalle, children }: { titulo: string; detalle?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-line py-3 text-sm first:border-t-0 first:pt-0">
      <span className="flex-1">
        <span className="block">{titulo}</span>
        {detalle && <span className="mt-0.5 block text-xs text-ink-2">{detalle}</span>}
      </span>
      {children}
    </div>
  );
}

/** Bloqueo con huella, registro rápido y pantalla privada. Solo en el APK; se guarda en este celular. */
export function AjustesSeguridad() {
  const s = useSeguridad();
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  if (!seguridadDisponible) return null;

  async function cambiarBloqueo() {
    setAviso('');
    if (s.bloqueo) { guardarSeguridad({ bloqueo: false }); return; }
    setOcupado(true);
    // Antes de activarlo, comprueba que la huella o el PIN funcionan para no dejar a nadie fuera
    const problema = await comprobarDispositivo();
    const r = problema ?? (await autenticar('Activar el bloqueo'));
    setOcupado(false);
    if (r === null) guardarSeguridad({ bloqueo: true });
    else setAviso(r);
  }

  const tiempos: [Rebloqueo, string][] = [['salir', 'Al salir'], ['1', '1 minuto'], ['5', '5 minutos']];

  return (
    <section className="card p-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
        <Lock size={15} /> Seguridad <span className="font-normal text-ink-2">· solo en este celular</span>
      </h2>
      <Opcion titulo="Bloquear con huella" detalle="Si la huella falla, puedes usar el PIN o patrón del celular.">
        <Interruptor activo={s.bloqueo} etiqueta="Bloquear con huella" onCambio={cambiarBloqueo} desactivado={ocupado} />
      </Opcion>
      {aviso && <p className="-mt-1 mb-2 text-xs font-medium text-expense">{aviso}</p>}
      {s.bloqueo && (
        <>
          <div className="border-t border-line py-3 text-sm">
            <span className="block">Volver a bloquear</span>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
              {tiempos.map(([v, txt]) => (
                <button key={v} onClick={() => guardarSeguridad({ rebloqueo: v })} className={`rounded-lg py-1.5 text-xs font-medium ${s.rebloqueo === v ? 'bg-surface font-semibold shadow-sm' : 'text-ink-2'}`}>{txt}</button>
              ))}
            </div>
          </div>
          <Opcion titulo="Registrar sin desbloquear" detalle="Desde el widget o la pantalla de bloqueo, solo para añadir movimientos.">
            <Interruptor activo={s.rapido} etiqueta="Registrar sin desbloquear" onCambio={() => guardarSeguridad({ rapido: !s.rapido })} />
          </Opcion>
        </>
      )}
      <Opcion titulo="Ocultar en apps recientes" detalle="La vista previa sale en blanco. También impide hacer capturas de pantalla.">
        <Interruptor activo={s.privacidad} etiqueta="Ocultar en apps recientes" onCambio={() => guardarSeguridad({ privacidad: !s.privacidad })} />
      </Opcion>
    </section>
  );
}

export function SiPierdesElCelular() {
  return (
    <section className="card p-4">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Smartphone size={15} /> Si pierdes el celular</h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-2">
        <li>Bloquéalo o bórralo a distancia con <b className="text-ink">Encontrar mi dispositivo</b> de Google.</li>
        <li>En tu hoja: <b className="text-ink">Extensiones › Apps Script › Implementar › Administrar implementaciones › Archivar</b>. Esta app dejará de tener acceso a tus datos.</li>
        <li>Crea una implementación nueva y pega la URL nueva en tu otro dispositivo.</li>
      </ol>
    </section>
  );
}
