import { Almacen, Categoria, Config, CONFIG_BASE, Datos, Movimiento } from './types';
import { uid } from '../lib/format';

const KEY = 'finanzas.demo';

export const CATEGORIAS_BASE: Categoria[] = [
  { id: 'c1', nombre: 'Sueldo', tipo: 'ingreso', icono: '💼', color: '#1F6FB2', presupuesto: '' },
  { id: 'c2', nombre: 'Freelance', tipo: 'ingreso', icono: '💻', color: '#0F7B8A', presupuesto: '' },
  { id: 'c3', nombre: 'Otros ingresos', tipo: 'ingreso', icono: '✨', color: '#5B6B8C', presupuesto: '' },
  { id: 'c4', nombre: 'Comida', tipo: 'gasto', icono: '🍽️', color: '#C8742B', presupuesto: 800 },
  { id: 'c5', nombre: 'Transporte', tipo: 'gasto', icono: '🚌', color: '#6A4CE2', presupuesto: 300 },
  { id: 'c6', nombre: 'Vivienda', tipo: 'gasto', icono: '🏠', color: '#1F6FB2', presupuesto: 1200 },
  { id: 'c7', nombre: 'Servicios', tipo: 'gasto', icono: '💡', color: '#0F7B8A', presupuesto: 250 },
  { id: 'c8', nombre: 'Salud', tipo: 'gasto', icono: '🩺', color: '#B23A48', presupuesto: '' },
  { id: 'c9', nombre: 'Ocio', tipo: 'gasto', icono: '🎬', color: '#D4A017', presupuesto: 200 },
  { id: 'c10', nombre: 'Otros gastos', tipo: 'gasto', icono: '📦', color: '#5B6B8C', presupuesto: '' },
];

function datosEjemplo(): Datos {
  const movs: Movimiento[] = [];
  const hoy = new Date();
  const plantilla: [string, number, number, string][] = [
    ['c6', 2, 1200, 'Alquiler'],
    ['c4', 5, 180, 'Supermercado'],
    ['c5', 7, 60, 'Recarga tarjeta'],
    ['c7', 10, 145, 'Luz y agua'],
    ['c4', 13, 95, 'Restaurante'],
    ['c9', 16, 70, 'Cine'],
    ['c4', 20, 210, 'Supermercado'],
    ['c5', 22, 45, 'Taxi'],
    ['c8', 24, 120, 'Farmacia'],
  ];
  for (let k = 5; k >= 0; k--) {
    const base = new Date(hoy.getFullYear(), hoy.getMonth() - k, 1);
    const y = base.getFullYear(), m = base.getMonth();
    const f = (d: number) => {
      const dia = k === 0 ? Math.min(d, hoy.getDate()) : d;
      return `${y}-${String(m + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    };
    const var_ = 0.85 + ((k * 37) % 30) / 100;
    movs.push({ id: uid(), fecha: f(1), tipo: 'ingreso', categoria: 'c1', monto: 4200, nota: 'Sueldo', creado: '' });
    if (k % 2 === 0) movs.push({ id: uid(), fecha: f(15), tipo: 'ingreso', categoria: 'c2', monto: Math.round(650 * var_), nota: 'Proyecto web', creado: '' });
    plantilla.forEach(([c, d, monto, nota]) => {
      if (k === 0 && d > hoy.getDate()) return;
      movs.push({ id: uid(), fecha: f(d), tipo: 'gasto', categoria: c, monto: Math.round(monto * var_), nota, creado: '' });
    });
  }
  return { movimientos: movs, categorias: CATEGORIAS_BASE, config: { ...CONFIG_BASE, nombre: 'Demo' } };
}

/** Modo demo: guarda todo en el propio teléfono, sin conectar nada. */
export class AlmacenDemo implements Almacen {
  modo = 'demo' as const;
  private leer(): Datos {
    try {
      const s = localStorage.getItem(KEY);
      if (s) return JSON.parse(s);
    } catch {}
    const d = datosEjemplo();
    this.escribir(d);
    return d;
  }
  private escribir(d: Datos) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {}
  }
  private cambiar(fn: (d: Datos) => void) {
    const d = this.leer();
    fn(d);
    this.escribir(d);
    return Promise.resolve();
  }
  async cargar() { return this.leer(); }
  agregar(m: Movimiento) { return this.cambiar((d) => d.movimientos.push({ ...m, creado: m.creado || new Date().toISOString() })); }
  editar(m: Movimiento) { return this.cambiar((d) => { d.movimientos = d.movimientos.map((x) => (x.id === m.id ? m : x)); }); }
  borrar(id: string) { return this.cambiar((d) => { d.movimientos = d.movimientos.filter((x) => x.id !== id); }); }
  guardarCategorias(c: Categoria[]) { return this.cambiar((d) => { d.categorias = c; }); }
  guardarConfig(c: Config) { return this.cambiar((d) => { d.config = c; }); }
  static reiniciar() { try { localStorage.removeItem(KEY); } catch {} }
}

