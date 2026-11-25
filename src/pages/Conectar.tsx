import { useState } from 'react';
import { Check, Copy, ExternalLink, Loader2, PlayCircle, ShieldCheck } from 'lucide-react';
import codigo from '../../apps-script/Code.gs?raw';
import { useFinanzas } from '../lib/store';

const PASOS = [
  <>Crea una hoja nueva en Google Sheets.</>,
  <>En la hoja: <b>Extensiones → Apps Script</b>. Borra lo que haya, pega el código y guarda (💾).</>,
  <><b>Implementar → Nueva implementación</b> → tipo <b>Aplicación web</b>. Ejecutar como: <b>Yo</b>. Acceso: <b>Cualquier usuario</b>.</>,
  <>Autoriza los permisos. Si ves «Google no verificó esta app», toca <b>Configuración avanzada → Ir a…</b> (es tu propio script).</>,
  <>Copia la <b>URL de la aplicación web</b> (termina en <code>/exec</code>) y pégala abajo.</>,
];

export function Conectar() {
  const { conectarSheets, usarDemo } = useFinanzas();
  const [url, setUrl] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [estado, setEstado] = useState<'idle' | 'cargando'>('idle');
  const [error, setError] = useState('');

  const copiar = async () => {
    try { await navigator.clipboard.writeText(codigo); setCopiado(true); setTimeout(() => setCopiado(false), 2500); }
    catch { setError('No se pudo copiar automáticamente. Abre el código con el enlace de abajo.'); }
  };

  const urlValida = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec\/?$/.test(url.trim());

  const conectar = async () => {
    setEstado('cargando'); setError('');
    try { await conectarSheets(url); }
    catch (e: any) { setError(e.message || 'No se pudo conectar'); setEstado('idle'); }
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <header className="mb-6 text-center">
        <img src="./icon.svg" alt="" className="mx-auto mb-3 size-16 rounded-2xl shadow-md" />
        <h1 className="text-2xl font-bold">Mis Finanzas</h1>
        <p className="mt-1 text-sm text-ink-2">Tus ingresos y gastos, guardados en tu propio Google Sheets.</p>
      </header>

      <section className="card mb-4 p-5">
        <h2 className="mb-1 font-semibold">Conecta tu hoja de Google</h2>
        <p className="mb-4 flex items-start gap-2 text-xs text-ink-2">
          <ShieldCheck size={16} className="mt-px shrink-0 text-ok" />
          Tus datos quedan solo en tu Google Drive. Nadie más tiene acceso.
        </p>

        <ol className="mb-4 space-y-3 text-sm">
          {PASOS.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-hero text-xs font-semibold text-white">{i + 1}</span>
              <span className="leading-relaxed">{p}</span>
            </li>
          ))}
        </ol>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <a className="btn btn-ghost text-sm" href="https://sheets.new" target="_blank" rel="noreferrer"><ExternalLink size={16} /> Nueva hoja</a>
          <button className="btn btn-ghost text-sm" onClick={copiar}>{copiado ? <><Check size={16} className="text-ok" /> Copiado</> : <><Copy size={16} /> Copiar código</>}</button>
        </div>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium text-ink-2">URL del script</span>
          <input className="input" placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="off" />
        </label>
        {url && !urlValida && <p className="mb-3 text-xs text-danger">La URL debe empezar con https://script.google.com/macros/s/ y terminar en /exec</p>}
        {error && <p className="mb-3 rounded-lg bg-danger/10 p-2 text-xs text-danger">{error}</p>}
        <button className="btn btn-primary w-full" disabled={!urlValida || estado === 'cargando'} onClick={conectar}>
          {estado === 'cargando' ? <><Loader2 size={18} className="animate-spin" /> Preparando tu hoja…</> : 'Conectar'}
        </button>
      </section>

      <button className="btn w-full border border-line bg-surface text-sm" onClick={usarDemo}>
        <PlayCircle size={18} className="text-gold-ink" /> Probar primero en modo demo
      </button>
      <p className="mt-2 text-center text-xs text-ink-2">El modo demo usa datos de ejemplo guardados solo en este dispositivo.</p>
    </div>
  );
}
