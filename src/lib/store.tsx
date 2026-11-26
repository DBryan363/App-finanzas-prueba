import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AlmacenDemo } from '../api/demo';
import { AlmacenSheets } from '../api/sheets';
import { Almacen, Categoria, Config, Datos, Movimiento } from '../api/types';

type Conexion = { modo: 'sheets'; url: string } | { modo: 'demo' } | null;

const K_CONEXION = 'finanzas.conexion';
const K_CACHE = 'finanzas.cache';

function leerLS<T>(k: string): T | null {
  try { const s = localStorage.getItem(k); return s ? (JSON.parse(s) as T) : null; } catch { return null; }
}
function escribirLS(k: string, v: unknown) {
  try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

function crearAlmacen(c: Conexion): Almacen | null {
  if (!c) return null;
  return c.modo === 'demo' ? new AlmacenDemo() : new AlmacenSheets(c.url);
}

interface Ctx {
  conexion: Conexion;
  datos: Datos | null;
  cargando: boolean;
  sincronizando: boolean;
  error: string | null;
  limpiarError(): void;
  conectarSheets(url: string): Promise<void>;
  usarDemo(): void;
  desconectar(): void;
  recargar(): Promise<void>;
  guardarMovimiento(m: Movimiento, nuevo: boolean): Promise<void>;
  /** Varios movimientos nuevos: aparecen todos al instante y se envían a la hoja de uno en uno. */
  agregarMovimientos(ms: Movimiento[]): Promise<void>;
  borrarMovimiento(id: string): Promise<void>;
  guardarCategorias(c: Categoria[]): Promise<void>;
  guardarConfig(c: Config): Promise<void>;
}

const Contexto = createContext<Ctx>(null as any);
export const useFinanzas = () => useContext(Contexto);

export function ProveedorFinanzas({ children }: { children: ReactNode }) {
  const [conexion, setConexion] = useState<Conexion>(() => leerLS<Conexion>(K_CONEXION));
  const [datos, setDatos] = useState<Datos | null>(() => leerLS<Datos>(K_CACHE));
  const [cargando, setCargando] = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const almacen = useMemo(() => crearAlmacen(conexion), [conexion]);

  // Mantiene una copia local para abrir la app al instante
  useEffect(() => { if (conexion?.modo === 'sheets') escribirLS(K_CACHE, datos); }, [datos, conexion]);

  const recargar = useCallback(async () => {
    if (!almacen) return;
    setCargando(true);
    try { setDatos(await almacen.cargar()); setError(null); }
    catch (e: any) { setError(e.message || 'No se pudo cargar'); }
    finally { setCargando(false); }
  }, [almacen]);

  useEffect(() => { recargar(); }, [recargar]);

  /** Cambio optimista: se ve al instante y se sincroniza por detrás. */
  const optimista = useCallback(
    async (cambio: (d: Datos) => Datos, accion: (a: Almacen) => Promise<void>) => {
      if (!almacen) return;
      setDatos((d) => (d ? cambio(d) : d));
      setPendientes((n) => n + 1);
      try { await accion(almacen); }
      catch (e: any) { setError('No se pudo guardar: ' + (e.message || e)); recargar(); }
      finally { setPendientes((n) => n - 1); }
    },
    [almacen, recargar],
  );

  const valor: Ctx = {
    conexion, datos, cargando, error,
    sincronizando: pendientes > 0,
    limpiarError: () => setError(null),
    async conectarSheets(url) {
      const limpia = url.trim();
      const a = new AlmacenSheets(limpia);
      const d = await a.conectar();
      const c: Conexion = { modo: 'sheets', url: limpia };
      escribirLS(K_CONEXION, c);
      setDatos(d);
      setConexion(c);
    },
    usarDemo() {
      const c: Conexion = { modo: 'demo' };
      escribirLS(K_CONEXION, c);
      setDatos(null);
      setConexion(c);
    },
    desconectar() {
      escribirLS(K_CONEXION, null);
      escribirLS(K_CACHE, null);
      setDatos(null);
      setConexion(null);
    },
    recargar,
    guardarMovimiento: (m, nuevo) =>
      optimista(
        (d) => ({ ...d, movimientos: nuevo ? [...d.movimientos, m] : d.movimientos.map((x) => (x.id === m.id ? m : x)) }),
        (a) => (nuevo ? a.agregar(m) : a.editar(m)),
      ),
    agregarMovimientos: (ms) =>
      optimista(
        (d) => ({ ...d, movimientos: [...d.movimientos, ...ms] }),
        async (a) => { for (const m of ms) await a.agregar(m); },
      ),
    borrarMovimiento: (id) =>
      optimista((d) => ({ ...d, movimientos: d.movimientos.filter((x) => x.id !== id) }), (a) => a.borrar(id)),
    guardarCategorias: (c) => optimista((d) => ({ ...d, categorias: c }), (a) => a.guardarCategorias(c)),
    guardarConfig: (c) => optimista((d) => ({ ...d, config: c }), (a) => a.guardarConfig(c)),
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
