/**
 * Convierte una frase dictada ("gasté 25 soles en almuerzo ayer") en un movimiento.
 * Todo se hace en el dispositivo, sin servicios externos.
 */
import type { Categoria, Tipo } from '../api/types';

export interface Interpretacion {
  tipo: Tipo | null;
  monto: number | null;
  categoria: string | null; // id
  fecha: string | null; // AAAA-MM-DD
  nota: string;
  /** Palabras del concepto, útiles para aprender si el usuario corrige la categoría. */
  concepto: string;
}

export const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!;:]/g, ' ').replace(/\.(?!\d)|(?<!\d)\./g, ' ').replace(/\s+/g, ' ').trim();

/* ───────── Palabras clave por defecto (según el nombre de la categoría) ───────── */

export const PALABRAS_BASE: Record<string, string[]> = {
  comida: ['comida', 'almuerzo', 'almorce', 'desayuno', 'cena', 'cene', 'menu', 'restaurante', 'pollo', 'pollería', 'polleria', 'chifa', 'cevicheria', 'ceviche', 'mercado', 'supermercado', 'super', 'plaza vea', 'tottus', 'metro', 'wong', 'bodega', 'pan', 'panaderia', 'cafe', 'snack', 'delivery', 'rappi', 'pedidosya', 'hamburguesa', 'pizza', 'fruta', 'verduras', 'abarrotes', 'comida rapida'],
  transporte: ['transporte', 'pasaje', 'pasajes', 'combi', 'micro', 'bus', 'metropolitano', 'corredor', 'tren', 'linea 1', 'taxi', 'uber', 'cabify', 'indrive', 'didi', 'mototaxi', 'gasolina', 'combustible', 'grifo', 'peaje', 'estacionamiento', 'cochera', 'tarjeta lima pass'],
  vivienda: ['vivienda', 'alquiler', 'renta', 'departamento', 'depa', 'cuarto', 'hipoteca', 'mantenimiento', 'condominio', 'arbitrios', 'predial'],
  servicios: ['servicios', 'luz', 'agua', 'internet', 'cable', 'telefono', 'celular', 'plan', 'recarga', 'gas', 'balon de gas', 'enel', 'luz del sur', 'sedapal', 'movistar', 'claro', 'entel', 'bitel', 'netflix', 'spotify', 'disney', 'suscripcion', 'recibo'],
  salud: ['salud', 'farmacia', 'botica', 'inkafarma', 'mifarma', 'medicina', 'medicinas', 'pastillas', 'doctor', 'medico', 'consulta', 'clinica', 'dentista', 'analisis', 'seguro', 'eps', 'gimnasio', 'gym'],
  ocio: ['ocio', 'cine', 'salida', 'fiesta', 'discoteca', 'tragos', 'cerveza', 'chelas', 'concierto', 'juego', 'videojuego', 'viaje', 'paseo', 'hobby', 'netflix'],
  educacion: ['educacion', 'curso', 'cursos', 'universidad', 'colegio', 'pension', 'libro', 'libros', 'matricula', 'utiles'],
  ropa: ['ropa', 'zapatillas', 'zapatos', 'polo', 'pantalon', 'casaca', 'vestido'],
  mascotas: ['mascota', 'mascotas', 'veterinario', 'veterinaria', 'perro', 'gato', 'comida de perro'],
  sueldo: ['sueldo', 'salario', 'quincena', 'planilla', 'gratificacion', 'grati', 'cts', 'bono', 'utilidades'],
  freelance: ['freelance', 'proyecto', 'cliente', 'trabajo extra', 'cachuelo', 'honorarios', 'recibo por honorarios', 'consultoria'],
};

export function palabrasDe(cat: Categoria, aprendidas: Record<string, string>): string[] {
  const nombre = normalizar(cat.nombre);
  const base = Object.entries(PALABRAS_BASE).find(([k]) => nombre.includes(k))?.[1] ?? [];
  const propias = (aprendidas[cat.id] ?? '').split(',').map(normalizar).filter(Boolean);
  return [...new Set([nombre, ...base, ...propias])];
}

/* ───────── Números dictados en palabras ───────── */

const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26,
  veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70,
  ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
  seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
};

/** "mil doscientos cincuenta" → "1250" (deja el resto del texto igual). */
function palabrasANumeros(texto: string) {
  const t = texto.split(' ');
  const out: string[] = [];
  let i = 0;
  while (i < t.length) {
    if (!(t[i] in UNIDADES) && t[i] !== 'mil') { out.push(t[i]); i++; continue; }
    let total = 0, actual = 0, usado = false;
    while (i < t.length) {
      const w = t[i];
      if (w in UNIDADES) { actual += UNIDADES[w]; usado = true; i++; }
      else if (w === 'mil') { total += (actual || 1) * 1000; actual = 0; usado = true; i++; }
      else if (w === 'y' && usado && i + 1 < t.length && t[i + 1] in UNIDADES) { i++; }
      else break;
    }
    // "un", "una" sueltos no son montos ("un menú")
    const valor = total + actual;
    if (valor === 1 && !t.slice(Math.max(0, i - 1), i).some((w) => w === 'mil')) out.push(t[i - 1]);
    else out.push(String(valor));
  }
  return out.join(' ');
}

/* ───────── Monto ───────── */

function extraerMonto(t: string): { monto: number | null; resto: string } {
  // "25 soles con 50" / "25 con 50 centimos"
  let m = t.match(/(\d+)\s*(?:soles?|lucas?|dolares?)?\s+con\s+(\d{1,2})\b(?:\s*(?:centimos?|centavos?))?/);
  if (m) return { monto: Number(m[1]) + Number(m[2].padEnd(2, '0')) / 100, resto: t.replace(m[0], ' ') };
  // "s/ 1,250.50", "1250.5", "25,50", "1.250"
  m = t.match(/(?:s\/\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  if (!m) return { monto: null, resto: t };
  let n = m[1];
  if (/^\d{1,3}([.,]\d{3})+$/.test(n)) n = n.replace(/[.,]/g, ''); // separador de miles
  else if (/[.,]\d{3}[.,]\d{1,2}$/.test(n)) n = n.slice(0, -3).replace(/[.,]/g, '') + '.' + n.slice(-2).replace(/\D/g, '');
  else n = n.replace(',', '.');
  return { monto: Number(n), resto: t.replace(m[0], ' ') };
}

/* ───────── Fecha ───────── */

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function extraerFecha(t: string, hoy: Date): { fecha: string | null; resto: string } {
  const d = new Date(hoy);
  let m: RegExpMatchArray | null;
  if ((m = t.match(/\b(anteayer|antier|antes de ayer)\b/))) { d.setDate(d.getDate() - 2); return { fecha: iso(d), resto: t.replace(m[0], ' ') }; }
  if ((m = t.match(/\bayer\b/))) { d.setDate(d.getDate() - 1); return { fecha: iso(d), resto: t.replace(m[0], ' ') }; }
  if ((m = t.match(/\bhoy\b/))) return { fecha: iso(d), resto: t.replace(m[0], ' ') };
  if ((m = t.match(/\bhace (\d+) dias?\b/))) { d.setDate(d.getDate() - Number(m[1])); return { fecha: iso(d), resto: t.replace(m[0], ' ') }; }
  if ((m = t.match(/\b(?:el )?(?:pasado )?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)(?: pasado)?\b/))) {
    const objetivo = DIAS.indexOf(m[1]);
    let diff = (d.getDay() - objetivo + 7) % 7;
    if (diff === 0 && /pasado/.test(m[0])) diff = 7;
    d.setDate(d.getDate() - diff);
    return { fecha: iso(d), resto: t.replace(m[0], ' ') };
  }
  return { fecha: null, resto: t };
}

/* ───────── Tipo ───────── */

const PISTAS_INGRESO = /\b(me pagaron|me depositaron|me yapearon|me plinearon|me transfirieron|cobre|recibi|gane|ingreso|ingresaron|vendi|me dieron|me devolvieron)\b/;
const PISTAS_GASTO = /\b(gaste|pague|compre|gasto|pago|salio|costo|invert[ií]|yapee|plinee|transferi|di)\b/;

/* ───────── Interpretación completa ───────── */

const RELLENO = new Set(['en', 'de', 'del', 'por', 'para', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'mi', 'mis', 'soles', 'sol', 'lucas', 'luca', 'dolares', 'centimos', 'con', 'y', 'que', 'me', 'a', 'al', 's/', 'se', 'fue', 'fueron']);

export function interpretar(frase: string, categorias: Categoria[], aprendidas: Record<string, string> = {}, hoy = new Date()): Interpretacion {
  let t = palabrasANumeros(normalizar(frase));

  let tipo: Tipo | null = PISTAS_INGRESO.test(t) ? 'ingreso' : PISTAS_GASTO.test(t) ? 'gasto' : null;
  t = t.replace(PISTAS_INGRESO, ' ').replace(PISTAS_GASTO, ' ');

  const f = extraerFecha(t, hoy);
  t = f.resto;
  const mo = extraerMonto(t);
  // Las comas que quedan ya no son decimales: separan palabras ("almuerzo, taxi")
  t = mo.resto.replace(/,/g, ' ');

  // Categoría: gana la palabra clave más larga encontrada (respetando el tipo si ya se sabe)
  let mejor: { id: string; tipo: Tipo; largo: number; palabra: string } | null = null;
  for (const c of categorias) {
    if (tipo && c.tipo !== tipo) continue;
    for (const p of palabrasDe(c, aprendidas)) {
      if (!p) continue;
      const re = new RegExp(`(^|\\s)${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`);
      if (re.test(t) && (!mejor || p.length > mejor.largo)) mejor = { id: c.id, tipo: c.tipo, largo: p.length, palabra: p };
    }
  }
  if (!tipo) tipo = mejor?.tipo ?? null;

  const concepto = t.split(' ').filter((w) => w && !RELLENO.has(w) && !/^\d+$/.test(w)).join(' ').trim();
  const nota = concepto ? concepto.charAt(0).toUpperCase() + concepto.slice(1, 60) : '';

  return { tipo, monto: mo.monto, categoria: mejor?.id ?? null, fecha: f.fecha, nota, concepto };
}

/* ───────── Varios movimientos en una sola frase ───────── */

const RE_MONTOS = /\d+\s*(?:soles?|lucas?|dolares?)?\s+con\s+\d{1,2}\b(?:\s*(?:centimos?|centavos?))?|(?:s\/\s*)?(?:\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/g;
const RE_FECHA_CON_NUMERO = /\bhace \d+ dias?\b/g;
const RE_SEPARADOR = /,|\s(?:y|tambien|ademas|luego|despues|aparte)\s/g;

/**
 * "Ayer gasté 20 en almuerzo, 15 en taxi y me pagaron 500" → 3 movimientos.
 * Cada trozo lleva un solo monto. Se corta en el último separador (coma, "y", "también"…)
 * entre dos montos; si no hay, justo antes del siguiente monto ("20 en almuerzo 15 en taxi").
 * La fecha y el tipo se heredan del trozo anterior cuando un trozo no los dice.
 */
export function interpretarVarios(frase: string, categorias: Categoria[], aprendidas: Record<string, string> = {}, hoy = new Date()): Interpretacion[] {
  const t = palabrasANumeros(normalizar(frase));
  const fechas = [...t.matchAll(RE_FECHA_CON_NUMERO)].map((m) => [m.index!, m.index! + m[0].length]);
  const montos = [...t.matchAll(RE_MONTOS)].filter((m) => !fechas.some(([a, b]) => m.index! < b && m.index! + m[0].length > a));
  if (montos.length < 2) return [interpretar(frase, categorias, aprendidas, hoy)];

  const trozos: string[] = [];
  let inicio = 0;
  for (let i = 0; i < montos.length - 1; i++) {
    const finA = montos[i].index! + montos[i][0].length;
    const iniB = montos[i + 1].index!;
    let corte = iniB, largo = 0;
    for (const s of t.slice(finA, iniB).matchAll(RE_SEPARADOR)) { corte = finA + s.index!; largo = s[0].length; }
    trozos.push(t.slice(inicio, corte));
    inicio = corte + largo;
  }
  trozos.push(t.slice(inicio));

  const rs = trozos.map((x) => interpretar(x, categorias, aprendidas, hoy));
  let fecha = rs.find((r) => r.fecha)?.fecha ?? null;
  let tipo = rs.find((r) => r.tipo)?.tipo ?? null;
  return rs.map((r) => {
    fecha = r.fecha ?? fecha;
    tipo = r.tipo ?? tipo;
    return { ...r, fecha, tipo };
  });
}

/** Lee/escribe las palabras aprendidas, guardadas en Config como JSON { idCategoria: "pasaje, combi" }. */
export function leerAprendidas(valor: unknown): Record<string, string> {
  try { return typeof valor === 'string' && valor ? JSON.parse(valor) : {}; } catch { return {}; }
}

export function aprender(aprendidas: Record<string, string>, catId: string, concepto: string): Record<string, string> | null {
  const palabra = normalizar(concepto);
  if (!palabra || palabra.split(' ').length > 3) return null;
  const actuales = (aprendidas[catId] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (actuales.includes(palabra)) return null;
  // Quita la palabra de otras categorías para evitar conflictos
  const nuevo: Record<string, string> = {};
  for (const [k, v] of Object.entries(aprendidas)) nuevo[k] = v.split(',').map((s) => s.trim()).filter((s) => s && s !== palabra).join(', ');
  nuevo[catId] = [...actuales, palabra].join(', ');
  return nuevo;
}
