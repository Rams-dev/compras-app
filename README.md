# Compras App

App en React Native (Expo) para registrar **compras importantes que se repiten cada cierto tiempo** (ej. aceite del auto, filtros, llantas) y recibir un **recordatorio** cuando se acerca la próxima compra. Funciona offline con SQLite. Incluye API opcional en FastAPI con el mismo modelo.

## Para qué sirve

- Llevar un historial de cuánto cuesta cada cosa y cada cuánto la compras.
- Ver de un vistazo cuándo toca volver a comprar ("Próxima: ...").
- Recibir una notificación local en el celular al llegar la fecha.

## Requisitos

| Herramienta | Versión usada | Notas |
|---|---|---|
| Node.js | 22 | `node -v` |
| npm | 10/11 | incluido con Node |
| Expo Go (celular) | SDK 57 | para probar sin compilar |
| Python | 3.12 | solo para la API opcional |
| Cuenta de Expo | gratis | solo para generar el APK en la nube |

No se necesita Android Studio para desarrollar ni para el APK (ver abajo).

## Instalación

```sh
cd compras-app
npm install
```

## Cómo correrla

```sh
npx expo start --clear   # mismo WiFi en PC y celular, escanear QR con Expo Go
```

- Teclas útiles en la terminal: `a` (Android USB/emulador, requiere `adb`), `w` (web), `r` (recargar), `c` (limpiar caché).
- Si el QR no conecta:une ambos a la misma red, o usa `npx expo start --tunnel`.
- `npm run android` requiere adb: `npm run setup:adb` lo instala sin Android Studio.

## Scripts

| Script | Qué hace |
|---|---|
| `npm start` | servidor de desarrollo |
| `npm run android` / `ios` / `web` | abre directo en cada plataforma |
| `npm run build:apk` | compila `.APK` en la nube (EAS, perfil `preview`) |
| `npm run setup:adb` | instala platform-tools y configura `ANDROID_HOME`/PATH |
| `npm run build:web` | export estático a `dist/` |

## Pantallas

| Pestaña | Contenido |
|---|---|
| **Productos** | Lista paginada (30 por página, scroll infinito) ordenada por fecha de creación, buscador por nombre, alta/edición, soft-delete y reactivar. Cada producto define si tiene recordatorio (on/off) y cada cuántos días. |
| **Compras** | Lista paginada ordenada por fecha de compra, filtro por producto (autocomplete con buscador y botón limpiar) y por rango de fechas, alta/edición, soft-delete y reactivar. El switch "Recordar esta compra" solo aparece si el producto tiene recordatorio. |

## Datos (SQLite, offline)

- `productos (id, nombre, recordar, intervalo_dias, fecha_creacion, fecha_actualizacion, estatus)`
- `compras (id, idProducto FK, recordar, fecha_compra default hoy, costo, fecha_creacion, estatus)`
- Eliminar = soft-delete (pasa a `inactivo`, nada se borra). Migraciones automáticas v1→v3 al abrir la app.
- Índices en `fecha_creacion`, `fecha_compra` e `idProducto`.

## Recordatorios

- Al guardar una compra con "Recordar" activo se programa una **notificación local** para `fecha_compra + intervalo_días`. Al editar se reprograma; al eliminar se cancela.
- Cada compra guarda su propio flag, por eso al editar el switch refleja lo guardado y la fecha "Próxima" solo se muestra si está activo.

## Generar el .APK

Sin Android Studio, vía EAS en la nube:

```sh
npm run build:apk
```

Instala `eas-cli` si falta, pide login la primera vez y compila el perfil `preview` (ver `eas.json`). Gracias al plugin `plugins/withSplitAbis` se genera **un APK por arquitectura** en vez del universal de ~100 MB: descarga el `arm64-v8a` (~25-35 MB). El perfil `production` genera AAB para Play Store.

## API (opcional)

Mismo modelo que la app (`productos`/`compras`, soft-delete, filtros y paginación `limit`/`offset`).

```sh
pip install -r api/requirements.txt
python -m uvicorn api.main:app --port 8000   # docs en /docs
```

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | estado |
| GET/POST | `/productos` | listar (filtros `nombre`, `incluir_inactivos`, `limit`, `offset`) / crear |
| PUT/DELETE | `/productos/{id}` | actualizar / soft-delete |
| POST | `/productos/{id}/reactivar` | reactivar |
| GET/POST | `/compras` | listar (filtros `idProducto`, `desde`, `hasta`, `incluir_inactivos`) / crear |
| PUT/DELETE | `/compras/{id}` | actualizar / soft-delete |
| POST | `/compras/{id}/reactivar` | reactivar |

## Limitaciones conocidas

- **Expo Go en Android**: las notificaciones no suenan (quitadas de Expo Go desde SDK 53); la app funciona normal y muestra la fecha "Próxima". Para notificaciones reales se necesita un *development build*.
- **Web**: usa un store en memoria (los datos se pierden al recargar, sin notificaciones). Solo demostrativa.
- `targetSdkVersion` actual: **36** (default de RN 0.86 / SDK 57).

## Solución de problemas

| Síntoma | Causa probable | Fix |
|---|---|---|
| Pantalla roja en Expo Go al abrir | bundle viejo en caché | `npx expo start --clear`, cerrar el proyecto en Expo Go y reescanear |
| QR no conecta | redes distintas / firewall | mismo WiFi, o `--tunnel` |
| `spawn adb ENOENT` | sin platform-tools | `npm run setup:adb` |
| Error `wa-sqlite.wasm` en web | falta loader wasm en Metro | ya resuelto vía `metro.config.js` (no tocar) |
| `Worker chunk not found` en web | worker alpha de expo-sqlite | ya resuelto: web usa store en memoria (no tocar `DBProvider`) |
| Error push notifications en Expo Go Android | importar `expo-notifications` crashea ahí | ya resuelto con carga diferida en `utils/notifications.ts` |

## Estructura

```
app/(tabs)/index.tsx  → Productos     app/(tabs)/two.tsx → Compras
app/(tabs)/_layout.tsx (tabs con iconos)   app/_layout.tsx (SQLite solo nativo)
components/ProductAutocomplete.tsx (+ botón limpiar)   components/DBProvider.* (nativo/web)
db/schema.ts (migraciones v1→v3)  db/productos.ts  db/compras.ts  db/useDB.*  db/memory.ts (fallback web)
utils/notifications.ts (lazy-load seguro)  utils/format.ts
plugins/withSplitAbis.js (APKs por ABI)    scripts/build-apk.ps1  scripts/setup-adb.ps1
api/main.py (FastAPI + SQLite)             eas.json  metro.config.js
```

## Auditoría (2026-09-10)

- Sin dead code: se eliminó la pantalla demo `modal`, `EditScreenInfo`, `StyledText`, `ExternalLink` y la dependencia sin uso `date-fns`. `Themed`/`useColorScheme` se conservan (los usa `+not-found`).
- Sin comentarios fuera de lugar ni TODOs.
- Rendimiento: consultas indexadas, listas paginadas de 30 con scroll infinito, cargas en paralelo (`Promise.all`), autocomplete topado a 20 resultados.
