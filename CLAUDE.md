# Mis Finanzas — guía para Claude

App personal de finanzas (ingresos/gastos en Google Sheets, moneda base PEN). Cada usuario pega la URL `/exec` de su propio Apps Script; no hay backend propio ni Google Cloud.

## Reglas de trabajo
- Responder al usuario en español.
- Rama de desarrollo: `ccr-3b236b79-2lityj`. No hacer PR salvo que se pida.
- **Nunca** commitear keystores, secretos ni credenciales (repo público). Firma vía Secrets `FINANZAS_KEYSTORE_BASE64` / `FINANZAS_KEYSTORE_PASSWORD` (alias `finanzas`); sin ellos el workflow genera clave temporal (hay que desinstalar antes de actualizar).
- El APK se construye solo bajo pedido (workflow manual `apk.yml`). Pages se despliega solo en cada push.
- No verificable aquí: github.io (proxy) ni dispositivo real/emulador. Probar con Playwright en web.

## Stack
React 18 + Vite 6 + TypeScript 5 + Tailwind v4 + Recharts + lucide-react. Vite `base: './'`. Capacitor 8 (`pe.misfinanzas.app`) con plugins `@capacitor/app` y `@capacitor-community/speech-recognition`.
Versiones fijadas (plugin-react@4, vite@6, typescript@5) por conflicto de peer deps.

## Mapa del código
- `apps-script/Code.gs` — backend que el usuario pega en su hoja (hojas Movimientos, Categorias, Config; acciones setup/agregar/editar/borrar/guardarCategorias/guardarConfig). Cambiarlo obliga a cada usuario a re-desplegar: preferir guardar cosas nuevas en Config.
- `src/api/` — `types.ts` (interfaz `Almacen`), `sheets.ts` (POST `text/plain` para evitar preflight CORS), `demo.ts` (localStorage).
- `src/lib/` — `store.tsx` (estado, actualizaciones optimistas con setState funcional), `interpretar.ts` (parser NLP local de frases de voz; palabras aprendidas en Config clave `palabras`), `voz.ts` (nativo vs Web Speech), `nativo.ts` (widget, deep links, botón atrás), `format.ts`, `stats.ts`.
- `src/components/`, `src/pages/` (Resumen, Movimientos, Ajustes, Conectar), `src/App.tsx`, `src/index.css`.
- `android/…/pe/misfinanzas/app/` — `MainActivity`, `WidgetPlugin` (`FinanzasWidget`), `FinanzasWidget` (AppWidget 4x1). Layout en `res/layout/widget_finanzas.xml`.
- `.github/workflows/` — `pages.yml`, `apk.yml` (release prerelease `apk-v0.1.N`).

## Diseño
- Paleta corporativa: navy `#0B1F3A`/`#17345e`, dorado `#C9A55A`. Ingreso azul `#1F6FB2` (oscuro `#4A90D9`), gasto cobre `#C8742B` (oscuro `#C97F3A`). Verde/rojo descartados (daltonismo).
- Modo oscuro por `data-theme` en `<html>` con variables CSS.
- Clases `.card`, `.input`, `.btn*` van dentro de `@layer components` (si no, pisan utilidades de Tailwind).

## Deep links del widget
`misfinanzas://inicio`, `misfinanzas://voz`, `misfinanzas://nuevo/gasto`, `misfinanzas://nuevo/ingreso`.

## Comandos
- `npm ci && npm run dev` / `npm run build`
- Android: `npm run build && npx cap sync android && cd android && ./gradlew assembleRelease` (Java 21)

## Pendientes / ideas
- Fijar clave de firma en Secrets para poder actualizar sin desinstalar.
- Alternativa futura: Google Sign-In (requiere Cloud Console).
- Plantilla de hoja con el script ya incluido.
- Feedback pendiente del usuario sobre APK v0.1.3 (dictado nativo y micro del widget).
