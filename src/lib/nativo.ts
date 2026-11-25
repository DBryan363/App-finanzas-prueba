import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Tipo } from '../api/types';

export const esNativo = Capacitor.isNativePlatform();

const Widget = registerPlugin<{
  actualizar(o: { mes: string; balance: string; ingresos: string; gastos: string }): Promise<void>;
}>('FinanzasWidget');

/** Envía los totales del mes al widget de Android (sin efecto en la web). */
export function actualizarWidget(o: { mes: string; balance: string; ingresos: string; gastos: string }) {
  if (esNativo) Widget.actualizar(o).catch(() => {});
}

function tipoDesdeUrl(url: string): Tipo | null {
  const m = url.match(/nuevo[/=](gasto|ingreso)/);
  return m ? (m[1] as Tipo) : null;
}

/**
 * Escucha los accesos directos: botones del widget (misfinanzas://nuevo/gasto)
 * o atajos de la web instalada (?nuevo=gasto). Devuelve la función para dejar de escuchar.
 */
export function escucharAccesos(abrirForm: (t: Tipo) => void, alVolver: () => boolean) {
  const inicial = tipoDesdeUrl(window.location.search);
  if (inicial) {
    abrirForm(inicial);
    history.replaceState(null, '', window.location.pathname);
  }
  if (!esNativo) return () => {};

  App.getLaunchUrl().then((r) => {
    const t = r?.url ? tipoDesdeUrl(r.url) : null;
    if (t) abrirForm(t);
  });
  const h1 = App.addListener('appUrlOpen', (e) => {
    const t = tipoDesdeUrl(e.url);
    if (t) abrirForm(t);
  });
  // Botón "atrás" de Android: primero cierra paneles / vuelve al resumen, luego sale
  const h2 = App.addListener('backButton', () => {
    if (!alVolver()) App.exitApp();
  });
  return () => {
    h1.then((h) => h.remove());
    h2.then((h) => h.remove());
  };
}
