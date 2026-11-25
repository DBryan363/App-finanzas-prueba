import { Almacen, Categoria, Config, Datos, Movimiento, normalizar } from './types';

/** Conecta con el Apps Script del usuario (su propia hoja de Google Sheets). */
export class AlmacenSheets implements Almacen {
  modo = 'sheets' as const;
  constructor(private url: string) {}

  private async get(accion: string) {
    const r = await fetch(`${this.url}?accion=${accion}`, { redirect: 'follow' });
    return this.leer(r);
  }

  private async post(body: object) {
    // text/plain evita la "preflight" CORS, que Apps Script no soporta
    const r = await fetch(this.url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
    return this.leer(r);
  }

  private async leer(r: Response) {
    const texto = await r.text();
    let json: any;
    try {
      json = JSON.parse(texto);
    } catch {
      throw new Error('La URL no respondió como el script de Mis Finanzas. Revisa que termine en /exec y que el acceso sea "Cualquier usuario".');
    }
    if (json.ok === false) throw new Error(json.error || 'Error en el script');
    return json;
  }

  /** Comprueba la URL y, si la hoja aún no tiene formato, se lo da. */
  async conectar(): Promise<Datos> {
    const d = await this.get('datos');
    return normalizar(d.listo ? d : await this.post({ accion: 'setup' }));
  }

  async cargar() {
    const d = await this.get('datos');
    if (!d.listo) return normalizar(await this.post({ accion: 'setup' }));
    return normalizar(d);
  }
  async agregar(mov: Movimiento) { await this.post({ accion: 'agregar', mov }); }
  async editar(mov: Movimiento) { await this.post({ accion: 'editar', mov }); }
  async borrar(id: string) { await this.post({ accion: 'borrar', id }); }
  async guardarCategorias(categorias: Categoria[]) { await this.post({ accion: 'guardarCategorias', categorias }); }
  async guardarConfig(config: Config) { await this.post({ accion: 'guardarConfig', config }); }
}
