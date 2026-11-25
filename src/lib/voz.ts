/** Dictado por voz con el reconocimiento del navegador (Chrome en Android y PC). */
const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

export const vozDisponible = !!SR;

export interface Escucha { detener(): void }

export function escuchar(opts: {
  parcial(texto: string): void;
  final(texto: string): void;
  error(msg: string): void;
  fin(): void;
}): Escucha | null {
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
