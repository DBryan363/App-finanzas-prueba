# Mis Finanzas

App personal de ingresos y gastos. Cada usuario guarda sus datos en **su propio Google Sheets**, así que la información es privada para cada uno.

## Cómo funciona

```
App (React, en GitHub Pages / APK)  ⇄  Apps Script del usuario  ⇄  Google Sheets del usuario
```

- `apps-script/Code.gs`: el "backend". Cada usuario lo pega en su propia hoja y lo implementa como **aplicación web**. La app le da formato a la hoja automáticamente (pestañas `Movimientos`, `Categorias` y `Config`).
- `src/`: la app (React + Vite + TypeScript + Tailwind + Recharts).
- **Modo demo**: permite probar la app sin conectar nada. Los datos se guardan solo en el dispositivo.

> La URL `/exec` del script funciona como una contraseña: quien la tenga puede leer y escribir en esa hoja. No la compartas.

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:5173
npm run build
```

## Publicación

Cada push a `main` (o a la rama de desarrollo) publica la app en GitHub Pages mediante `.github/workflows/pages.yml`.
Requisito: en el repositorio, **Settings → Pages → Source: GitHub Actions**.

## Próximos pasos

- [ ] APK Android con Capacitor, compilado por GitHub Actions
- [ ] Inicio de sesión con Google (Cloud Console) como alternativa al script
