/**
 * Dictado por voz.
 *  - En el APK: reconocimiento nativo de Android (ventana de Google).
 *  - En la web: reconocimiento del navegador (Chrome en Android y PC).
 */
import { SpeechRecognition as VozNativa } from '@capacitor-community/speech-recognition';
import { esNativo } from './nativo';

const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

export const vozDisponible = esNativo || !!SR;

export interface Escucha { detener(): void }

interface Opciones {
  parcial(texto: string): void;
  final(texto: string): void;
  error(msg: string): void;
  fin(): void;
}

export function escuchar(opts: Opciones): Escucha | null {
  return esNativo ? escucharNativo(opts) : escucharWeb(opts);
}

function escucharNativo(opts: Opciones): Escucha {
  (async () => {
    try {
      const { available } = await VozNativa.available();
      if (!available) throw new Error('Este celular no tiene reconocimiento de voz. Instala o activa la app de Google.');
      let permiso = await VozNativa.checkPermissions();
      if (permiso.speechRecognition !== 'granted') permiso = await VozNativa.requestPermissions();
      if (permiso.speechRecognition !== 'granted') throw new Error('Permite el uso del micrófono para dictar.');
      const r = await VozNativa.start({ language: 'es-PE', maxResults: 1, popup: true, partialResults: false, prompt: 'Ej.: gasté 25 soles en almuerzo' });
      const texto = r.matches?.[0]?.trim();
      if (texto) opts.final(texto);
      else opts.error('No te escuché. Toca el micrófono e intenta de nuevo.');
    } catch (e: any) {
      const msg = String(e?.message || e);
      // Cancelar la ventana de Google no es un error
      if (!/cancel|no match|didn't understand/i.test(msg)) opts.error(msg.length < 120 ? msg : 'No se pudo usar el micrófono.');
      else opts.error('No te escuché. Toca el micrófono e intenta de nuevo.');
    } finally {
      opts.fin();
    }
  })();
  return { detener: () => { VozNativa.stop().catch(() => {}); } };
}

function escucharWeb(opts: Opciones): Escucha | null {
  if (!SR) { opts.error('Tu navegador no permite dictado por voz. Usa Chrome.'); return null; }
  const r = new SR();
  r.lang = 'es-PE';
  r.interimResults = true;
  r.maxAlternatives = 1;
  r.continuous = false;
  let entregado = false;
  r.onresult = (e: any) => {
    let texto = '';
    let esFinal = false;
    for (let i = 0; i < e.results.length; i++) {
      texto += e.results[i][0].transcript;
      if (e.results[i].isFinal) esFinal = true;
    }
    if (esFinal) { entregado = true; opts.final(texto.trim()); } else opts.parcial(texto);
  };
  r.onerror = (e: any) => {
    const m: Record<string, string> = {
      'not-allowed': 'Permite el uso del micrófono para dictar.',
      'service-not-allowed': 'Permite el uso del micrófono para dictar.',
      'no-speech': 'No te escuché. Toca el micrófono e intenta de nuevo.',
      network: 'El dictado necesita conexión a internet.',
      'audio-capture': 'No se encontró un micrófono.',
    };
    if (e.error !== 'aborted') opts.error(m[e.error] || 'No se pudo usar el micrófono.');
  };
  r.onend = () => { if (!entregado) opts.parcial(''); opts.fin(); };
  try { r.start(); } catch { opts.error('No se pudo iniciar el micrófono.'); return null; }
  return { detener: () => r.stop() };
}
