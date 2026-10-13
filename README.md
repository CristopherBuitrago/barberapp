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

## API del back

| Ruta | Quién | Para qué |
|---|---|---|
| `GET /api/servicios`, `GET /api/barberos` | público | catálogo |
| `GET /api/disponibilidad?servicioId&fecha&barberoId?` | público | horas libres |
| `POST /api/citas` | público / agente | reservar (web exige aceptar datos) |
| `POST /api/citas/:id/cancelar`, `/reprogramar` | público (con teléfono del dueño) | gestionar cita |
| `POST /api/clientes/registro` | público | registro + descuento |
| `/api/interno/*` | agente (`x-api-key`) | contacto por teléfono, agenda, bloqueos |
| `/api/panel/*` | panel (`x-panel-clave`) | calendario, estados, citas presenciales, bloqueos |

## Pendiente (siguientes fases)

- Recordatorios automáticos 24 h / 2 h antes (requiere plantillas aprobadas en Meta).
- Resumen diario por WhatsApp a cada barbero.
- Reportes, productos y segmentación de clientes (quién compra productos de cabello).
- Usuarios por barbero en el panel (hoy es una sola clave compartida).
- Persistir conversaciones del agente en base de datos.
