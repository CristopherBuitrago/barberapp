# Barbería · reservas por WhatsApp y web

Agenda de citas para una barbería (diseño de Figma "Diego Barber"):

- **Clientes** reservan por **WhatsApp** (agente con IA que habla como los de la barbería) o por la **página web**.
- **Barberos** ven el calendario en el **panel web** (`/panel`) y también por **WhatsApp** (si su número está registrado, el agente los atiende en "modo barbero": agenda del día y bloquear horas).
- Registro con **descuento de bienvenida** (por defecto 10 % en la primera cita después de registrarse).

```
personal/
├── back/     API REST · Node + Express + Prisma + PostgreSQL     (puerto 3000)
├── agente/   Webhook de WhatsApp Cloud API (Meta) + Claude        (puerto 3001)
├── front/    Web del cliente + panel · React + Vite               (puerto 5173)
└── docker-compose.yml   PostgreSQL local (puerto 5433)
```

```
WhatsApp ──► Meta Cloud API ──► agente /webhook/whatsapp ──► Claude (herramientas) ──► back /api
Navegador ─────────────────────► front ────────────────────────────────────────────────► back /api
```

El agente y la web usan **la misma API de disponibilidad**, así que nunca se cruzan citas. El back valida cada reserva dentro de una transacción serializable.

## Puesta en marcha (desarrollo)

Requisitos: Node 22+ y Docker o Podman.

```bash
# 1. Base de datos
docker compose up -d          # o: podman compose up -d

# 2. Back
cd back
cp .env.example .env          # ajustar claves
npm install
npx prisma db push            # crea las tablas
npm run db:seed               # servicios y barberos de ejemplo
npm run equipo:cuenta -- --nombre Diego --telefono 3001234567 --clave "una-clave" --admin   # cuenta para el panel
npm run dev

# 3. Front (otra terminal)
cd front
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173  ·  panel: http://localhost:5173/panel

# 4. Agente (otra terminal)
cd agente
cp .env.example .env          # ANTHROPIC_API_KEY + datos de Meta
npm install
npm run chat                  # chatear con el agente en la terminal, sin WhatsApp
npm run dev                   # servidor del webhook
```

> **Podman en Windows**: si `podman run` falla con `controller pids is not available`, usar `--cgroups=disabled`. Si el puerto no se publica en `localhost`, usar en `DATABASE_URL` la IP de la máquina de Podman (`podman machine ssh -- ip -4 addr show eth0`).
>
> **Proxy corporativo**: Node no usa el proxy del sistema. Para que el agente llegue a `graph.facebook.com` y a la API de Claude, arrancarlo con `NODE_USE_ENV_PROXY=1` y `HTTPS_PROXY` configurado.

## Conectar WhatsApp (Meta for Developers)

1. En [developers.facebook.com](https://developers.facebook.com) crear una app tipo **Empresa** y agregar el producto **WhatsApp**.
2. En **WhatsApp › Configuración de la API** copiar:
   - `Phone number ID` → `WHATSAPP_PHONE_NUMBER_ID`
   - Un **token permanente** (Configuración del negocio › Usuarios del sistema › generar token con permisos `whatsapp_business_messaging` y `whatsapp_business_management`) → `WHATSAPP_TOKEN`. El token temporal del panel dura 24 h.
3. **Configuración de la app › Básica › Clave secreta** → `WHATSAPP_APP_SECRET` (con ella se valida la firma `X-Hub-Signature-256` de cada webhook).
4. Exponer el agente con HTTPS (en desarrollo: `ngrok http 3001` o `cloudflared tunnel`).
5. En **WhatsApp › Configuración › Webhook**:
   - URL de devolución de llamada: `https://<tu-dominio>/webhook/whatsapp`
   - Token de verificación: el mismo valor de `WHATSAPP_VERIFY_TOKEN`
   - Suscribirse al campo **messages**.
6. Para producción: verificar el negocio en Meta y registrar el número real de la barbería. Ese número deja de funcionar en la app normal de WhatsApp (salvo que Meta habilite la *coexistencia* con WhatsApp Business App).

**Ventana de 24 h**: el agente solo puede escribir texto libre a alguien que le haya escrito en las últimas 24 h. Para escribir primero (recordatorios, avisos al equipo) hay que crear **plantillas** aprobadas en el Administrador de WhatsApp; `ClienteWhatsApp.enviarPlantilla()` ya está lista para usarlas.

## Cómo está armado el agente

- `whatsapp/ClienteWhatsApp.ts`: interfaz de salida (texto, leído + "escribiendo…", plantillas). `MetaWhatsAppCliente` la implementa sobre la Graph API. Para cambiar de proveedor (Twilio, 360dialog) basta con otra implementación.
- `whatsapp/webhook.ts`: verificación GET, validación de firma, deduplicación de reintentos de Meta y conversión de audios/imágenes a una nota de texto.
- `backend/BarberiaApi.ts`: interfaz hacia el back; `HttpBarberiaApi` la implementa con `x-api-key`.
- `conversaciones/RepositorioConversaciones.ts`: historial por número (en memoria; para varias instancias, implementarlo sobre Redis o PostgreSQL). La conversación se reinicia tras `HORAS_SESION` sin mensajes.
- `agente/prompt.ts`: **personalidad**. Ajustarla con frases reales de los barberos para que suene como ellos.
- `agente/herramientas.ts`: lo que Claude puede hacer. Clientes: ver servicios, disponibilidad, agendar, mis citas, cancelar, reprogramar, pasar a humano. Barberos: ver agenda, bloquear horario. El teléfono siempre sale de WhatsApp, nunca del modelo.
- `pasar_a_humano`: el agente deja de responder a ese cliente por 2 h y avisa a `BARBERIA_TELEFONO_AVISOS`.
- Modelo: `claude-opus-5-5` con esfuerzo `low` (configurable con `CLAUDE_MODELO` y `CLAUDE_ESFUERZO`), con *fallback* del servidor activado (`fallbacks: "default"`) por si el modelo declina una respuesta.

## Diseño de la web del cliente

La web del cliente sigue el archivo de Figma [Diego Barber](https://www.figma.com/design/lJTRg7KKFLe5rf83Gwxc5Q/Untitled) (frames `142:3` catálogo, `164:41` servicio, `165:107` fecha y hora, `165:193` confirmar, `171:2` reservado, `171:66` catálogo con botones deshabilitados). Está diseñada a 320 px de ancho.

- Colores y medidas del diseño: variables `--db-*` en `front/src/estilos.css`, aplicadas solo dentro de `.pagina` (el panel conserva su estilo).
- Logo e íconos exportados de Figma: `front/src/assets/figma/`.
- Fuente: Albert Sans (Google Fonts, en `front/index.html`).
- Responsive: el contenido se escala con `--db-escala` (`zoom`: 1 hasta 359 px, 1.1, 1.2 desde 400 px y 1.4 desde 768 px) para que el diseño de 320 px llene el celular y se lea bien en escritorio. En pantallas anchas el catálogo pasa a cuadrícula y los pasos de la reserva quedan en una tarjeta centrada de 480 px.
- Fecha: semana de lunes a sábado con flechas. Hora: se elige la jornada (Mañana / Tarde / Noche) y luego la hora; una jornada sin cupo sale en gris con "No hay horarios disponibles".
- Una cita activa por cliente: con una cita agendada, su tarjeta en el catálogo muestra la fecha y el botón naranja **AGENDADA** (lleva al detalle para cancelarla) y los demás *Reservar* quedan en gris. El back también lo valida para la web y WhatsApp; el panel sí puede agendar varias.
- Lo que la web ya tenía y no está en el diseño se mantuvo con el mismo estilo: aviso de descuento, botón de WhatsApp, elegir barbero, autorización de datos (Ley 1581), agregar al calendario y cancelar la cita.

## Cuentas e inicio de sesión

Perfil según los frames `2010:8` (datos de la cuenta), `2010:69` (iniciar sesión) y `2010:101` (crear cuenta).

- Todos entran con **teléfono + contraseña** en `/perfil`. Si el teléfono es de un barbero con cuenta, entra al panel; si no, es un cliente.
- Cabecera: menú a la izquierda (Panel, Servicios, Mi cita, Mi perfil, Crear cuenta, Cerrar sesión, según quién entró) y perfil a la derecha. Dentro del perfil el ícono se vuelve una **X** que regresa a donde estaba (el catálogo o el panel).
- **Clientes**: se registran en `/perfil/registro` (nombres, teléfono, contraseña, fecha de nacimiento y autorización de datos) y reciben el descuento de bienvenida. Si ya habían reservado sin cuenta, la cuenta se une a su ficha. Con sesión, la reserva usa su nombre y teléfono y el catálogo trae su cita activa del servidor (también las de WhatsApp). Se puede seguir reservando sin cuenta.
- **Barberos y admin**: el panel ya no usa una clave compartida; pide la sesión de alguien del equipo. Su perfil no tiene fecha de nacimiento y el botón azul vuelve al panel. La cuenta se crea o cambia con:

  ```bash
  cd back
  npm run equipo:cuenta -- --nombre Diego --telefono 3001234567 --clave "una-clave" [--admin]
  ```

  Ese teléfono es también el que el agente de WhatsApp atiende en "modo barbero".
- Contraseñas con scrypt; la sesión es un token aleatorio de 30 días del que la base solo guarda el SHA-256.
- El teléfono no se edita desde el perfil (es con lo que se inicia sesión).

## API del back

| Ruta | Quién | Para qué |
|---|---|---|
| `GET /api/servicios`, `GET /api/barberos` | público | catálogo |
| `GET /api/disponibilidad?servicioId&fecha&barberoId?` | público | horas libres |
| `POST /api/citas` | público / agente | reservar (web exige aceptar datos; máximo una cita activa por cliente) |
| `GET /api/citas/:id?telefono` | público (con teléfono del dueño) | estado actual de la cita |
| `POST /api/citas/:id/cancelar`, `/reprogramar` | público (con teléfono del dueño) | gestionar cita |
| `POST /api/cuenta/login`, `/registro`, `/logout` | público / con sesión | iniciar sesión, crear cuenta de cliente (+ descuento), cerrar sesión |
| `GET` y `PATCH /api/cuenta/yo`, `GET /api/cuenta/yo/cita-activa` | con sesión (`Authorization: Bearer`) | datos del perfil y cita activa del cliente |
| `/api/interno/*` | agente (`x-api-key`) | contacto por teléfono, agenda, bloqueos |
| `/api/panel/*` | sesión de barbero o admin | calendario, estados, citas presenciales, bloqueos |

## Pendiente (siguientes fases)

- Recordatorios automáticos 24 h / 2 h antes (requiere plantillas aprobadas en Meta).
- Resumen diario por WhatsApp a cada barbero.
- Reportes, productos y segmentación de clientes (quién compra productos de cabello).
- Persistir conversaciones del agente en base de datos.
