# Compras App

App en React Native (Expo) para registrar **compras importantes que se repiten cada cierto tiempo** (ej. aceite del auto, filtros, llantas) y recibir un **recordatorio** cuando se acerca la próxima compra.

## Para qué sirve

- Llevar un historial de cuánto cuesta cada cosa y cada cuánto la compras.
- Ver de un vistazo cuándo toca volver a comprar ("Próxima: ...").
- Recibir una notificación local en el celular al llegar la fecha.

## Pantallas

| Pestaña | Contenido |
|---|---|
| **Productos** | Lista ordenada por fecha de creación (recientes primero), buscador por nombre, alta/edición, eliminar con soft-delete y reactivar. Cada producto define si tiene recordatorio y cada cuántos días. |
| **Compras** | Lista ordenada por fecha de compra (recientes primero), filtro por producto (autocomplete con buscador) y por rango de fechas, alta/edición, soft-delete y reactivar. |

## Datos (SQLite, offline)

- `productos`: nombre, flag recordar (on/off), intervalo en días, fecha de creación/actualización, estatus (activo/inactivo).
- `compras`: producto, fecha de compra (default: hoy), costo, flag recordar propio, fecha de creación, estatus.
- Eliminar = soft-delete (pasa a inactivo, nada se borra físicamente). Migraciones automáticas v1→v3.

## Recordatorios

- Al guardar una compra con "Recordar" activo se programa una **notificación local** para `fecha_compra + intervalo_días`. Al editar o eliminar se reprograma/cancela.
- El switch de la compra solo aparece si el producto tiene recordatorio activado.

## Cómo correrla

```sh
cd compras-app
npx expo start --clear   # mismo WiFi en PC y celular, escanear QR con Expo Go
```

## Generar el .APK

Sin Android Studio, vía EAS en la nube (gratis con cuenta de Expo):

```sh
npm run build:apk
```

El script instala `eas-cli` si falta, pide login la primera vez y compila el perfil `preview` (ver `eas.json`), que genera `.APK` instalable directo. Al terminar da el enlace de descarga.

## Limitaciones conocidas

- **Expo Go en Android**: las notificaciones no suenan (Google las quitó de Expo Go desde SDK 53); la app funciona normal y muestra la fecha "Próxima". Para notificaciones reales en Android se necesita un *development build* (`npx expo run:android`).
- **Web**: usa un store en memoria (sirve para probar la UI; los datos se pierden al recargar y no hay notificaciones).

## Estructura

```
app/(tabs)/index.tsx  → Productos     app/(tabs)/two.tsx → Compras
components/ProductAutocomplete.tsx     components/DBProvider.* (nativo/web)
db/schema.ts (migraciones)  db/productos.ts  db/compras.ts  db/useDB.*  db/memory.ts (fallback web)
utils/notifications.ts  utils/format.ts
```

## Auditoría (2026-09-10)

- Sin dead code: se eliminó la pantalla demo `modal`, `EditScreenInfo`, `StyledText`, `ExternalLink` y la dependencia sin uso `date-fns`. `Themed`/`useColorScheme` se conservan (los usa `+not-found`).
- Sin comentarios fuera de lugar ni TODOs; solo quedan logs de diagnóstico eliminados.
- Sin cuellos de botella para uso personal: consultas indexadas (`fecha_creacion`, `fecha_compra`, `idProducto`), cargas de Productos+Compras en paralelo (`Promise.all`) y autocomplete limitado a 20 resultados. Con miles de registros convendría paginar las listas.
