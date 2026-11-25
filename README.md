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

- [x] APK Android con Capacitor, compilado por GitHub Actions
- [ ] Inicio de sesión con Google (Cloud Console) como alternativa al script

## APK Android

- Cada push compila el APK con `.github/workflows/apk.yml` y lo publica en **Releases** (`apk-v0.1.N`).
- `android/` es el proyecto de Capacitor. Incluye un **widget** (`FinanzasWidget.java`) que muestra el balance del mes y tiene botones para registrar un gasto o un ingreso. Esos botones abren la app con `misfinanzas://nuevo/gasto`.
- **Firma:** la clave no se guarda en el repositorio. Si existen los secrets `FINANZAS_KEYSTORE_BASE64` (el archivo .keystore en base64, con alias `finanzas`) y `FINANZAS_KEYSTORE_PASSWORD`, el workflow los usa y cada APK se instala encima del anterior. Si no existen, genera una clave temporal en cada compilación, y para actualizar hay que desinstalar la versión anterior.
