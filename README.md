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

## Arquitectura del back

Arquitectura limpia por capas (no por funcionalidad). Cada capa solo conoce a las de adentro: la presentación usa la aplicación, la aplicación usa el dominio y la infraestructura implementa lo que el dominio y la aplicación piden. El código va en inglés, y la base de datos y la API siguen en español para no romper el front ni el agente.

```
back/src/
├── domain/              reglas del negocio, sin Express ni Prisma
│   ├── entities/        clases con get, set y relaciones (Appointment, Barber, Client, Service...)
│   ├── repositories/    interfaces (AppointmentRepository, ServiceRepository...)
│   ├── services/        cálculo de horas libres
│   ├── value-objects/   teléfono y zona horaria
│   └── errors/          NotFoundError, ConflictError, RuleViolationError...
├── application/
│   ├── use-cases/       un caso de uso por archivo (CreateAppointment, Login, UpdateService...)
│   ├── dtos/            lo que entra y sale de los casos de uso
│   └── ports/           Clock, PasswordHasher, TokenService, TransactionRunner
├── infrastructure/
│   ├── persistence/     repositorios con Prisma y la transacción serializable
│   ├── security/        scrypt y tokens de sesión
│   └── config/          configuración y secretos
├── presentation/http/
│   ├── controllers/     reciben la petición, llaman el caso de uso y responden
│   ├── routes/          las rutas de /api
│   ├── middlewares/     sesión, equipo, admin, agente y errores
│   ├── validators/      esquemas zod de lo que llega
│   └── presenters/      arman el JSON en español que esperan el front y el agente
└── main.ts              arma todo a mano y arranca el servidor
```

### Entidades

Cada entidad es una clase con sus atributos privados, `get` y `set`. Los `set` validan (un precio negativo o un nombre vacío lanzan `RuleViolationError`) y las reglas del negocio son métodos de la clase: `appointment.cancel()`, `appointment.reschedule()`, `client.register()`, `client.useWelcomeDiscount()`, `service.update()`, `session.isValidAt()`.

Las relaciones son objetos: una `Appointment` tiene su `Client`, su `Barber` y su `Service`, un `Barber` tiene sus `WorkSchedule`, un `Service` tiene el `Barber` que lo creó y el que lo cambió, un `TimeBlock` tiene su `Barber` y una `Session` tiene su dueño (`Client` o `Barber`).

Se crean con un método de fábrica (`Appointment.schedule()`, `Client.create()`, `Service.create()`...) y los repositorios las arman desde la base con `restore()`. Una entidad nueva no tiene id hasta que se guarda con el `save()` de su repositorio.

### Pruebas

```bash
cd back
docker exec barberapp-postgres-1 psql -U barberia -d barberia -c "CREATE DATABASE barberia_test;"   # una sola vez
DATABASE_URL="postgresql://barberia:barberia@localhost:5433/barberia_test?schema=public" npx prisma db push
npm test            # todas
npm run test:unit   # casos de uso y dominio con repositorios en memoria, sin base
npm run test:api    # la API de verdad contra barberia_test
```

Las pruebas de la API borran y vuelven a cargar `barberia_test` cada vez, nunca tocan la base de desarrollo.

## API del back

### Documentación (Swagger)

Con el back corriendo:

- **http://localhost:3000/api/docs**: pantalla de Swagger con cada ruta, lo que recibe, lo que responde y sus códigos de error. Se puede probar cada ruta desde ahí. Para las del panel, inicia sesión con `POST /api/cuenta/login`, copia el `token` y pégalo en **Authorize** (`bearerAuth`). Para las del agente, pon la clave en `agentKey`.
- **http://localhost:3000/api/docs/openapi.json**: el documento OpenAPI 3.1, para importarlo en Postman o Insomnia.

El documento está en `back/src/presentation/http/docs/openapi.ts`. Lo que se manda sale de los mismos esquemas zod que validan las peticiones. Lo que se responde está escrito ahí, así que si cambias un presenter hay que cambiarlo también en ese archivo. La prueba `tests/api/docs.test.ts` avisa si se documenta una ruta que no existe o una respuesta sin el sobre.

### Formato de las respuestas

Todas las respuestas tienen la misma forma. Las llaves del sobre van en inglés y los datos de adentro en español.

```jsonc
// Un objeto
{ "success": true, "data": { "id": 5, "inicio": "2026-10-30T10:00:00-05:00", ... }, "error": null }

// Una lista: siempre paginada con ?page=1&perPage=20 (máximo 100)
{ "success": true, "data": [ ... ], "pagination": { "page": 1, "perPage": 20, "total": 57 }, "error": null }

// Algo que no devuelve nada (cerrar sesión, borrar un bloqueo)
{ "success": true, "data": null, "error": null }

// Un error
{ "success": false, "data": null, "error": { "code": "SLOT_TAKEN", "message": "Esa hora ya no está disponible", "details": null } }
```

- `code` es fijo y sirve para decidir en el front o el agente. `message` está en español y se le puede mostrar a la persona.
- En un error de validación (`VALIDATION_ERROR`), `details` dice qué campo falló: `[{ "field": "fecha", "message": "Formato YYYY-MM-DD" }]`.
- Los códigos están en `back/src/domain/errors/ErrorCode.ts`: `SERVICE_NOT_FOUND`, `APPOINTMENT_NOT_FOUND`, `SLOT_TAKEN`, `ACTIVE_APPOINTMENT_EXISTS`, `APPOINTMENT_NOT_ACTIVE`, `TIME_IN_PAST`, `DATA_POLICY_REQUIRED`, `PHONE_ALREADY_REGISTERED`, `INVALID_CREDENTIALS`, `AUTH_REQUIRED`, `TEAM_ONLY`, `ADMIN_ONLY`, `INVALID_API_KEY`, `ROUTE_NOT_FOUND`, `INTERNAL_ERROR`, entre otros.
- La única ruta que no usa el sobre es `GET /api/imagenes/:id`, que devuelve la imagen tal cual porque la usa un `<img>`.
- El front (`front/src/api.ts`) y el agente (`HttpBarberiaApi`) sacan `data` del sobre, y para las listas que necesitan completas piden todas las páginas.

### Rutas

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
| `GET`, `POST /api/panel/servicios`, `PATCH /api/panel/servicios/:id`, `POST /api/panel/imagenes` | solo admin | catálogo de servicios e imágenes (JPG, PNG o WebP, máx. 3 MB) |
| `GET /api/imagenes/:id` | público | imagen subida desde el panel |

## Servicios e imágenes

El admin los administra en `/panel/servicios` (menú › *Administrar servicios*): nombre, descripción, duración, precio, imagen y si se ve en la web y en WhatsApp. Los servicios no se borran porque las citas pasadas los referencian; se ocultan. Las imágenes se guardan en la base (tabla `Imagen`), así que el respaldo de la base incluye todo.

## Secretos

Las claves (`DATABASE_URL`, `AGENTE_API_KEY`, `BACK_API_KEY`, `ANTHROPIC_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`) se leen primero de un archivo: `/run/secrets/<nombre en minúsculas>` (como los monta Docker) o la ruta en `<NOMBRE>_FILE`. Si no hay archivo, se usa la variable del `.env`, que queda solo para desarrollo.

## Pendiente (siguientes fases)

- Recordatorios automáticos 24 h / 2 h antes (requiere plantillas aprobadas en Meta).
- Resumen diario por WhatsApp a cada barbero.
- Reportes, productos y segmentación de clientes (quién compra productos de cabello).
- Persistir conversaciones del agente en base de datos.
