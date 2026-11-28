/**
 * Bloqueo con huella (o PIN del celular) y pantalla privada en «apps recientes».
 * Solo en el APK. Las preferencias se guardan en este celular, no en la hoja:
 * la versión web no tiene huella y no debe verse afectada.
 */
import { useSyncExternalStore } from 'react';
import { BiometricAuth, BiometryError, BiometryErrorType, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { PrivacyScreen } from '@capacitor/privacy-screen';
import { esNativo } from './nativo';

export type Rebloqueo = 'salir' | '1' | '5';

export interface PrefsSeguridad {
  /** Pedir huella o PIN al abrir la app. */
  bloqueo: boolean;
  /** Cuándo volver a bloquear después de salir de la app. */
  rebloqueo: Rebloqueo;
  /** Permitir registrar movimientos sin desbloquear (widget y pantalla de bloqueo). */
  rapido: boolean;
  /** Vista previa en blanco en «apps recientes» (también impide capturas). */
  privacidad: boolean;
}

const K = 'finanzas.seguridad';
const BASE: PrefsSeguridad = { bloqueo: false, rebloqueo: '1', rapido: true, privacidad: false };

/** Solo para probar en el navegador: `VITE_PROBAR_SEGURIDAD=1 npm run build` simula un celular con huella. */
const simulado = import.meta.env.VITE_PROBAR_SEGURIDAD === '1';
export const seguridadDisponible = esNativo || simulado;
let simulacion: Promise<unknown> | null = null;
const prepararSimulacion = () =>
  simulado
    ? (simulacion ??= (async () => {
        // En serie: el simulador del plugin se carga con la primera llamada
        await BiometricAuth.setBiometryType(BiometryType.fingerprintAuthentication);
        await BiometricAuth.setBiometryIsEnrolled(true);
        await BiometricAuth.setDeviceIsSecure(true);
      })())
    : null;

function leer(): PrefsSeguridad {
  try {
    const s = localStorage.getItem(K);
    return s ? { ...BASE, ...JSON.parse(s) } : BASE;
  } catch {
    return BASE;
  }
}

let prefs = leer();
const oyentes = new Set<() => void>();

export function guardarSeguridad(cambios: Partial<PrefsSeguridad>) {
  prefs = { ...prefs, ...cambios };
  try { localStorage.setItem(K, JSON.stringify(prefs)); } catch {}
  if ('privacidad' in cambios) aplicarPrivacidad();
  oyentes.forEach((f) => f());
}

export const leerSeguridad = () => prefs;

export function useSeguridad() {
  return useSyncExternalStore((f) => { oyentes.add(f); return () => oyentes.delete(f); }, () => prefs);
}

/** ¿Hay que pedir huella al abrir? */
export const bloqueoActivo = () => seguridadDisponible && prefs.bloqueo;

export const minutosRebloqueo = () => (prefs.rebloqueo === 'salir' ? 0 : Number(prefs.rebloqueo));

export function aplicarPrivacidad() {
  if (!esNativo) return;
  (prefs.privacidad ? PrivacyScreen.enable() : PrivacyScreen.disable()).catch(() => {});
}

/**
 * El diálogo de huella (y sobre todo el de PIN) pausa y reanuda la app.
 * Mientras dura, y un momento después, esas pausas no deben volver a bloquear.
 */
let autenticandoHasta = 0;
export const autenticandoAhora = () => Date.now() < autenticandoHasta;

/** ¿Se puede activar el bloqueo en este celular? Devuelve un mensaje si no. */
export async function comprobarDispositivo(): Promise<string | null> {
  try {
    await prepararSimulacion();
    const r = await BiometricAuth.checkBiometry();
    if (r.isAvailable || r.deviceIsSecure) return null;
    return 'Configura una huella o un PIN en tu celular para poder usar el bloqueo.';
  } catch {
    return 'Este celular no permite usar el bloqueo.';
  }
}

/** Pide huella (o PIN del celular). Devuelve null si se desbloqueó, o un mensaje de error. Cancelar no es error: devuelve ''. */
export async function autenticar(motivo = 'Desbloquear Mis Finanzas'): Promise<string | null> {
  autenticandoHasta = Number.MAX_SAFE_INTEGER;
  try {
    await prepararSimulacion();
    await BiometricAuth.checkBiometry();
    await BiometricAuth.authenticate({
      reason: motivo,
      cancelTitle: 'Cancelar',
      allowDeviceCredential: true,
      androidTitle: motivo,
      androidSubtitle: 'Usa tu huella o el bloqueo de tu celular',
      androidConfirmationRequired: false,
    });
    return null;
  } catch (e) {
    const code = e instanceof BiometryError ? e.code : null;
    if (code === BiometryErrorType.userCancel || code === BiometryErrorType.appCancel || code === BiometryErrorType.systemCancel) return '';
    if (code === BiometryErrorType.noDeviceCredential || code === BiometryErrorType.passcodeNotSet)
      return 'Tu celular no tiene PIN ni huella configurados.';
    if (code === BiometryErrorType.biometryLockout) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    return 'No se pudo verificar tu identidad. Inténtalo de nuevo.';
  } finally {
    autenticandoHasta = Date.now() + 1500;
  }
}
