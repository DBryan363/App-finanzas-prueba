import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Lock, Mic } from 'lucide-react';
import { Tipo } from '../api/types';
import { autenticar } from '../lib/seguridad';

interface Props {
  /** Pedir la huella nada más mostrarse (no si se abrió para registrar rápido). */
  pedirAlAbrir: boolean;
  /** Mostrar los botones de «Registrar sin desbloquear». */
  rapido: boolean;
  onDesbloquear(): void;
  onRegistrar(a: { tipo?: Tipo; voz?: boolean }): void;
}

/** Pantalla que tapa la app hasta que el usuario pone su huella o el PIN del celular. */
export function Bloqueo({ pedirAlAbrir, rapido, onDesbloquear, onRegistrar }: Props) {
  const [error, setError] = useState('');
  const [pidiendo, setPidiendo] = useState(false);
  const pedido = useRef(false);

  async function desbloquear() {
    if (pidiendo) return;
    setPidiendo(true);
    setError('');
    const r = await autenticar();
    setPidiendo(false);
    if (r === null) onDesbloquear();
    else setError(r);
  }

  // Pide la huella al abrir, pero espera un momento: si la app se abrió desde el widget
  // para registrar, el formulario llega un poco después y entonces no hay que pedirla.
  const pedir = useRef(pedirAlAbrir);
  pedir.current = pedirAlAbrir;
  useEffect(() => {
    const t = setTimeout(() => {
      if (pedir.current && !pedido.current) {
        pedido.current = true;
        desbloquear();
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const boton = 'flex items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 py-3.5 text-sm font-semibold active:bg-white/20';

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center bg-gradient-to-br from-hero to-hero-2 px-7 pb-safe pt-[max(env(safe-area-inset-top),5rem)] text-white">
      <img src="./icon.svg" alt="" className="size-20 rounded-[22px] shadow-xl" />
      <h1 className="mt-5 text-2xl font-bold">Mis Finanzas</h1>
      <p className="mt-1 text-sm text-white/70">Tus datos están protegidos</p>

      <div className="mt-9 grid size-24 place-items-center rounded-full border-2 border-gold/50">
        <Lock size={38} className="text-gold" />
      </div>

      <button onClick={desbloquear} disabled={pidiendo} className="btn mt-8 w-full max-w-sm bg-gold text-[#0a1220]">
        Desbloquear
      </button>
      {error && <p className="mt-3 max-w-sm text-center text-sm text-gold">{error}</p>}

      {rapido && (
        <div className="mb-6 mt-auto w-full max-w-sm">
          <p className="mb-2.5 text-center text-xs uppercase tracking-wider text-white/60">Registrar sin desbloquear</p>
          <div className="grid grid-cols-[1fr_1fr_3.5rem] gap-2">
            <button className={boton} onClick={() => onRegistrar({ tipo: 'gasto' })}><ArrowDownRight size={16} /> Gasto</button>
            <button className={boton} onClick={() => onRegistrar({ tipo: 'ingreso' })}><ArrowUpRight size={16} /> Ingreso</button>
            <button className={boton} onClick={() => onRegistrar({ voz: true })} aria-label="Registrar con voz"><Mic size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
