/**
 * Mis Finanzas — backend en Google Apps Script.
 *
 * Instalación (una sola vez):
 *  1. Crea una hoja nueva en Google Sheets.
 *  2. Extensiones → Apps Script. Borra lo que haya y pega TODO este archivo. Guarda.
 *  3. Implementar → Nueva implementación → Tipo: Aplicación web.
 *       Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 *  4. Autoriza los permisos y copia la URL que termina en /exec.
 *  5. Pégala en la app. La app crea las pestañas y da formato a la hoja.
 *
 * La URL funciona como una contraseña: no la compartas.
 */

const VERSION = 1;

const HOJAS = {
  Movimientos: ['id', 'fecha', 'tipo', 'categoria', 'monto', 'nota', 'creado'],
  Categorias: ['id', 'nombre', 'tipo', 'icono', 'color', 'presupuesto'],
  Config: ['clave', 'valor'],
};

const CATEGORIAS_INICIALES = [
  ['c1', 'Sueldo', 'ingreso', '💼', '#1F6FB2', ''],
  ['c2', 'Freelance', 'ingreso', '💻', '#0F7B8A', ''],
  ['c3', 'Otros ingresos', 'ingreso', '✨', '#5B6B8C', ''],
  ['c4', 'Comida', 'gasto', '🍽️', '#C8742B', 800],
  ['c5', 'Transporte', 'gasto', '🚌', '#6A4CE2', 300],
  ['c6', 'Vivienda', 'gasto', '🏠', '#1F6FB2', 1200],
  ['c7', 'Servicios', 'gasto', '💡', '#0F7B8A', 250],
  ['c8', 'Salud', 'gasto', '🩺', '#B23A48', ''],
  ['c9', 'Ocio', 'gasto', '🎬', '#D4A017', 200],
  ['c10', 'Otros gastos', 'gasto', '📦', '#5B6B8C', ''],
];

const CONFIG_INICIAL = [
  ['nombre', ''],
  ['moneda', 'PEN'],
  ['metaAhorro', 1000],
  ['tema', 'sistema'],
];

const COLOR_MARCA = '#0B1F3A';

/* ───────────── Entrada HTTP ───────────── */

function doGet(e) {
  return responder(() => {
    const accion = (e && e.parameter && e.parameter.accion) || 'datos';
    if (accion === 'ping') return { ok: true, version: VERSION };
    if (accion === 'datos') return leerTodo();
    throw new Error('Acción no válida: ' + accion);
  });
}

function doPost(e) {
  return responder(() => {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      switch (body.accion) {
        case 'setup': preparar(); return leerTodo();
        case 'agregar': agregarMovimiento(body.mov); return { ok: true };
        case 'editar': editarMovimiento(body.mov); return { ok: true };
        case 'borrar': borrarMovimiento(body.id); return { ok: true };
        case 'guardarCategorias': guardarCategorias(body.categorias); return { ok: true };
        case 'guardarConfig': guardarConfig(body.config); return { ok: true };
        default: throw new Error('Acción no válida: ' + body.accion);
      }
    } finally {
      lock.releaseLock();
    }
  });
}

function responder(fn) {
  let out;
  try {
    out = fn();
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ───────────── Formato de la hoja ───────────── */

function preparar() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(HOJAS).forEach((nombre) => {
    let sh = ss.getSheetByName(nombre);
    const nueva = !sh;
    if (!sh) sh = ss.insertSheet(nombre);
    const cab = HOJAS[nombre];
    sh.getRange(1, 1, 1, cab.length).setValues([cab])
      .setFontWeight('bold').setFontColor('#FFFFFF').setBackground(COLOR_MARCA);
    sh.setFrozenRows(1);
    if (nueva && nombre === 'Categorias') {
      sh.getRange(2, 1, CATEGORIAS_INICIALES.length, cab.length).setValues(CATEGORIAS_INICIALES);
    }
    if (nueva && nombre === 'Config') {
      sh.getRange(2, 1, CONFIG_INICIAL.length, 2).setValues(CONFIG_INICIAL);
    }
  });

  const mov = ss.getSheetByName('Movimientos');
  mov.getRange('B:B').setNumberFormat('@'); // fecha como texto AAAA-MM-DD
  mov.getRange('E:E').setNumberFormat('#,##0.00');
  mov.setColumnWidth(1, 120);
  mov.setColumnWidth(6, 260);
  ss.getSheetByName('Categorias').getRange('F:F').setNumberFormat('#,##0.00');

  // Quita la hoja vacía por defecto ("Hoja 1" / "Sheet1")
  ss.getSheets().forEach((sh) => {
    if (!HOJAS[sh.getName()] && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
  ss.setActiveSheet(mov);
  ss.moveActiveSheet(1);

  guardarConfigClave('version', VERSION);
}

/* ───────────── Lectura ───────────── */

function leerTodo() {
  const ss = SpreadsheetApp.getActive();
  const listo = Object.keys(HOJAS).every((n) => ss.getSheetByName(n));
  if (!listo) return { ok: true, listo: false };
  const config = {};
  filas('Config').forEach((r) => { if (r.clave) config[r.clave] = r.valor; });
  return {
    ok: true,
    listo: true,
    nombreHoja: ss.getName(),
    urlHoja: ss.getUrl(),
    movimientos: filas('Movimientos').filter((r) => r.id),
    categorias: filas('Categorias').filter((r) => r.id),
    config: config,
  };
}

function filas(nombre) {
  const sh = SpreadsheetApp.getActive().getSheetByName(nombre);
  const valores = sh.getDataRange().getValues();
  const cab = valores.shift() || [];
  const tz = Session.getScriptTimeZone();
  return valores.map((r) => {
    const o = {};
    cab.forEach((h, i) => {
      let v = r[i];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
      o[h] = v;
    });
    return o;
  });
}

/* ───────────── Escritura ───────────── */

function filaMovimiento(m) {
  return [String(m.id), String(m.fecha), m.tipo, m.categoria, Number(m.monto) || 0, m.nota || '', m.creado || new Date().toISOString()];
}

function buscarFila(sh, id) {
  const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  throw new Error('No se encontró el movimiento ' + id);
}

function agregarMovimiento(m) {
  SpreadsheetApp.getActive().getSheetByName('Movimientos').appendRow(filaMovimiento(m));
}

function editarMovimiento(m) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Movimientos');
  const fila = buscarFila(sh, m.id);
  sh.getRange(fila, 1, 1, 7).setValues([filaMovimiento(m)]);
}

function borrarMovimiento(id) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Movimientos');
  sh.deleteRow(buscarFila(sh, id));
}

function reescribir(nombre, filasNuevas) {
  const sh = SpreadsheetApp.getActive().getSheetByName(nombre);
  const cols = HOJAS[nombre].length;
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, cols).clearContent();
  if (filasNuevas.length) sh.getRange(2, 1, filasNuevas.length, cols).setValues(filasNuevas);
}

function guardarCategorias(cats) {
  reescribir('Categorias', (cats || []).map((c) => [c.id, c.nombre, c.tipo, c.icono, c.color, c.presupuesto === '' || c.presupuesto == null ? '' : Number(c.presupuesto)]));
}

function guardarConfig(cfg) {
  reescribir('Config', Object.keys(cfg || {}).map((k) => [k, cfg[k]]));
}

function guardarConfigClave(clave, valor) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Config');
  const datos = sh.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === clave) { sh.getRange(i + 1, 2).setValue(valor); return; }
  }
  sh.appendRow([clave, valor]);
}
