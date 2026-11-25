export type Tipo = 'ingreso' | 'gasto';

export interface Movimiento {
  id: string;
  fecha: string; // AAAA-MM-DD
  tipo: Tipo;
  categoria: string; // id de categoría
  monto: number;
  nota: string;
  creado: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  tipo: Tipo;
  icono: string;
  color: string;
  presupuesto: number | '';
}

export interface Config {
  nombre: string;
  moneda: string;
  metaAhorro: number;
  tema: 'sistema' | 'claro' | 'oscuro';
  [k: string]: string | number;
}

export interface Datos {
  movimientos: Movimiento[];
  categorias: Categoria[];
  config: Config;
  urlHoja?: string;
  nombreHoja?: string;
}

/** Cualquier origen de datos (Google Sheets o modo demo) cumple esta interfaz. */
export interface Almacen {
  modo: 'sheets' | 'demo';
  cargar(): Promise<Datos>;
  agregar(m: Movimiento): Promise<void>;
  editar(m: Movimiento): Promise<void>;
  borrar(id: string): Promise<void>;
  guardarCategorias(c: Categoria[]): Promise<void>;
  guardarConfig(c: Config): Promise<void>;
}

export const CONFIG_BASE: Config = { nombre: '', moneda: 'PEN', metaAhorro: 1000, tema: 'sistema' };

export function normalizar(raw: any): Datos {
  const cfg = { ...CONFIG_BASE, ...(raw.config || {}) } as Config;
  cfg.metaAhorro = Number(cfg.metaAhorro) || 0;
  return {
    urlHoja: raw.urlHoja,
    nombreHoja: raw.nombreHoja,
    config: cfg,
    categorias: (raw.categorias || []).map((c: any) => ({
      id: String(c.id),
      nombre: String(c.nombre),
      tipo: c.tipo === 'ingreso' ? 'ingreso' : 'gasto',
      icono: String(c.icono || '•'),
      color: String(c.color || '#5B6B8C'),
      presupuesto: c.presupuesto === '' || c.presupuesto == null ? '' : Number(c.presupuesto),
    })),
    movimientos: (raw.movimientos || []).map((m: any) => ({
      id: String(m.id),
      fecha: String(m.fecha).slice(0, 10),
      tipo: m.tipo === 'ingreso' ? 'ingreso' : 'gasto',
      categoria: String(m.categoria),
      monto: Number(m.monto) || 0,
      nota: String(m.nota || ''),
      creado: String(m.creado || ''),
    })),
  };
}
