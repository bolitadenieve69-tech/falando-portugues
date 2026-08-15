# Monitorización

Dos piezas independientes: **Sentry** (errores en la app) y **uptime** (¿está vivo el
backend?). Ambas están pensadas para la beta privada: baratas, silenciosas y sin
recoger datos personales.

## Sentry (errores de la app)

El código ya está integrado, pero **desactivado**: sin DSN no se inicializa nada ni se
hace ninguna llamada de red. Para activarlo:

1. Crear una cuenta gratuita en [sentry.io](https://sentry.io) y un proyecto de tipo
   **React Native**.
2. Copiar el DSN del proyecto.
3. Pegarlo en `.env.local` (local) o en los secrets de EAS (builds):
   ```
   EXPO_PUBLIC_SENTRY_DSN=https://…@…ingest.sentry.io/…
   EXPO_PUBLIC_SENTRY_ENV=beta
   ```
4. **Hacer un dev build nuevo.** `@sentry/react-native` es un módulo nativo: no basta
   con recargar el JS.

Para desactivarlo en cualquier momento, basta con vaciar la variable.

### Privacidad (importante en esta app)

Esta app graba voz, así que el wrapper (`src/services/monitoring.ts`) es deliberadamente
restrictivo:

- `sendDefaultPii: false` — no se envían IPs ni identificadores del dispositivo.
- Las cabeceras `Authorization`, `X-App-Token`, `xi-api-key` y `cookie` se redactan en
  breadcrumbs y eventos.
- Los **cuerpos de petición y query strings se eliminan**: pueden contener texto hablado.
- Los tokens que se hubieran colado en un mensaje de error se redactan por patrón
  (`Bearer …` y tokens hex de 64 caracteres).
- **Las transcripciones nunca se adjuntan**: `captureError` solo envía el error y una
  etiqueta corta y estática (p. ej. `session-start`).
- `tracesSampleRate: 0` — sin performance tracing, para no gastar cuota.

Estas reglas están cubiertas por tests en `src/__tests__/monitoring.test.ts`.

Regla al añadir nuevas llamadas: **nunca** pasar texto de conversación como contexto.
Usa una etiqueta fija que describa *dónde* falló, no *qué* dijo el usuario.

## Uptime (¿está vivo el backend?)

El backend expone `GET /health`, que responde `{"status":"ok"}` y **no requiere
autenticación**, así que sirve directamente como sonda externa.

Configuración sugerida con [UptimeRobot](https://uptimerobot.com) (plan gratuito):

| Campo | Valor |
|---|---|
| Monitor type | HTTP(s) |
| URL | `https://37-27-196-137.nip.io/health` |
| Intervalo | 5 minutos |
| Keyword (opcional) | `ok` — alerta si el cuerpo deja de contenerlo |
| Alertas | tu email |

Comprobación manual equivalente:

```bash
curl -fsS https://37-27-196-137.nip.io/health
```

Cuando cambies el `nip.io` por un dominio propio, actualiza también la URL del monitor.

### Qué vigilar además

El contenedor ya tiene un `healthcheck` en `docker-compose.yml`, así que Docker reinicia
el backend si deja de responder. Para ver el estado en el VPS:

```bash
docker compose ps
docker compose logs -f --tail=200
```

Los fallos del bot de voz se registran con el nombre de la sala y **solo el tipo** de
excepción (no se vuelcan tokens ni datos personales), así que `docker compose logs` es el
sitio donde mirar si un tester reporta que el tutor no se conectó.
