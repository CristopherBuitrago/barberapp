/**
 * Documento OpenAPI de la API. Lo que se manda (cuerpos y consultas) sale de los mismos
 * esquemas zod que validan, y lo que se responde está escrito aquí igual que en ApiPresenter.
 * Si cambias una ruta o un presenter, cámbialo aquí también (la prueba de la documentación avisa
 * si una ruta documentada no existe).
 */
import { ErrorCode } from "../../../domain/errors/ErrorCode.js";
import {
  agendaQuery,
  availabilityQuery,
  clientProfileBody,
  dateRangeQuery,
  idParam,
  loginBody,
  newAppointment,
  ownerPhoneBody,
  ownerPhoneQuery,
  pageQuery,
  registerBody,
  rescheduleBody,
  serviceBody,
  statusBody,
  timeBlockBody,
  timeBlockRangeQuery,
} from "../validators/schemas.js";
import { z } from "zod";
import { empty, errors, invalidJson, jsonBody, list, ok, paramsFromZod, ref, validation } from "./openapiHelpers.js";

const e = (code: ErrorCode, message: string) => ({ code, message });

// Errores que se repiten en varias rutas
const teamOnly = e(ErrorCode.TeamOnly, "Inicia sesión con una cuenta del equipo");
const adminOnly = e(ErrorCode.AdminOnly, "Solo el administrador puede hacer esto");
const authRequired = e(ErrorCode.AuthRequired, "Inicia sesión para continuar");
const invalidApiKey = e(ErrorCode.InvalidApiKey, "No autorizado");
const serviceNotFound = e(ErrorCode.ServiceNotFound, "Servicio no encontrado");
const appointmentNotFound = e(ErrorCode.AppointmentNotFound, "Cita no encontrada");
const slotTaken = e(ErrorCode.SlotTaken, "Esa hora ya no está disponible con ese barbero");
const timeInPast = e(ErrorCode.TimeInPast, "Esa hora ya pasó");
const notActive = e(ErrorCode.AppointmentNotActive, "La cita ya no está activa");
const invalidRange = e(ErrorCode.InvalidTimeRange, "El fin debe ser después del inicio");

const page = paramsFromZod(pageQuery, "query");
const idPath = paramsFromZod(idParam, "path");
const query = (schema: z.ZodObject) => [...paramsFromZod(schema, "query")];

const team = [{ cookieAuth: [] }];
const agent = [{ agentKey: [] }];

const nullable = (schema: Record<string, unknown>) => ({ oneOf: [schema, { type: "null" }] });

// --- Lo que responde la API, igual que ApiPresenter ---

const schemas = {
  Pagination: {
    type: "object",
    required: ["page", "perPage", "total"],
    properties: {
      page: { type: "integer", example: 1 },
      perPage: { type: "integer", example: 20 },
      total: { type: "integer", description: "Cuántos hay en total, sumando todas las páginas", example: 57 },
    },
  },
  ErrorEnvelope: {
    type: "object",
    required: ["success", "data", "error"],
    properties: {
      success: { const: false },
      data: { type: "null" },
      error: {
        type: "object",
        required: ["code", "message", "details"],
        properties: {
          code: { type: "string", enum: Object.values(ErrorCode), description: "Fijo, para decidir qué hacer" },
          message: { type: "string", description: "En español, para mostrarle a la persona" },
          details: {
            description: "En VALIDATION_ERROR dice qué campo falló, en los demás es null",
            oneOf: [
              { type: "null" },
              {
                type: "array",
                items: {
                  type: "object",
                  properties: { field: { type: "string", example: "fecha" }, message: { type: "string", example: "Formato YYYY-MM-DD" } },
                },
              },
            ],
          },
        },
      },
    },
  },
  Barbero: {
    type: "object",
    required: ["id", "nombre"],
    properties: { id: { type: "integer", example: 1 }, nombre: { type: "string", example: "Diego" } },
  },
  MiembroEquipo: {
    type: "object",
    description: "Barbero o admin, como lo ve el panel. Nunca trae la contraseña",
    properties: {
      id: { type: "integer" },
      nombre: { type: "string" },
      telefono: { type: ["string", "null"], example: "573001234567" },
      activo: { type: "boolean" },
      esAdmin: { type: "boolean" },
      horarios: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            barberoId: { type: "integer" },
            diaSemana: { type: "integer", minimum: 0, maximum: 6, description: "0 es domingo" },
            horaInicio: { type: "string", example: "09:00" },
            horaFin: { type: "string", example: "19:00" },
          },
        },
      },
    },
  },
  Servicio: {
    type: "object",
    properties: {
      id: { type: "integer", example: 1 },
      nombre: { type: "string", example: "Corte a máquina" },
      descripcion: { type: "string", example: "Corte con máquina y acabado a tijera." },
      duracionMin: { type: "integer", example: 30 },
      precio: { type: "integer", description: "En pesos, sin decimales", example: 20000 },
      imagenUrl: { type: ["string", "null"], example: "/api/imagenes/3" },
      activo: { type: "boolean" },
      creadoPorId: { type: ["integer", "null"] },
      actualizadoPorId: { type: ["integer", "null"] },
      creadoEn: { type: "string", format: "date-time" },
      actualizadoEn: { type: "string", format: "date-time" },
    },
  },
  ServicioAdmin: {
    allOf: [
      ref("Servicio"),
      {
        type: "object",
        properties: { creadoPor: nullable(ref("Barbero")), actualizadoPor: nullable(ref("Barbero")) },
      },
    ],
  },
  HoraDisponible: {
    type: "object",
    properties: {
      inicio: { type: "string", format: "date-time", example: "2026-10-30T10:00:00-05:00" },
      barberos: { type: "array", items: ref("Barbero"), description: "Los que pueden atender a esa hora" },
    },
  },
  Cita: {
    type: "object",
    properties: {
      id: { type: "integer", example: 12 },
      inicio: { type: "string", format: "date-time", example: "2026-10-30T10:00:00-05:00", description: "En hora de Colombia" },
      fin: { type: "string", format: "date-time", example: "2026-10-30T10:30:00-05:00" },
      estado: { type: "string", enum: ["AGENDADA", "CANCELADA", "COMPLETADA", "NO_ASISTIO"] },
      canal: { type: "string", enum: ["WEB", "WHATSAPP", "PANEL"] },
      precio: { type: "integer", example: 20000 },
      descuentoPct: { type: "integer", example: 10 },
      precioFinal: { type: "integer", example: 18000 },
      notas: { type: "string" },
      barbero: ref("Barbero"),
      servicio: {
        type: "object",
        properties: { id: { type: "integer" }, nombre: { type: "string" }, duracionMin: { type: "integer" } },
      },
      cliente: {
        type: "object",
        properties: { id: { type: "integer" }, nombre: { type: "string" }, telefono: { type: "string", example: "573101234567" } },
      },
    },
  },
  Bloqueo: {
    type: "object",
    properties: {
      id: { type: "integer" },
      barberoId: { type: "integer" },
      inicio: { type: "string", format: "date-time", example: "2026-10-30T12:00:00-05:00" },
      fin: { type: "string", format: "date-time", example: "2026-10-30T13:00:00-05:00" },
      motivo: { type: "string", example: "Almuerzo" },
      barbero: ref("Barbero"),
    },
  },
  Usuario: {
    type: "object",
    properties: {
      rol: { type: "string", enum: ["CLIENTE", "BARBERO", "ADMIN"] },
      nombre: { type: "string" },
      telefono: { type: "string", example: "573101234567" },
      fechaNacimiento: { type: ["string", "null"], format: "date", description: "Siempre null para el equipo" },
    },
  },
  Sesion: {
    type: "object",
    properties: {
      usuario: ref("Usuario"),
    },
  },
  Contacto: {
    oneOf: [
      {
        type: "object",
        title: "Barbero",
        properties: { tipo: { const: "barbero" }, barbero: ref("Barbero") },
      },
      {
        type: "object",
        title: "Cliente",
        properties: {
          tipo: { const: "cliente" },
          cliente: nullable({
            type: "object",
            properties: {
              nombre: { type: "string" },
              registrado: { type: "boolean" },
              descuentoPendientePct: { type: "integer", example: 10 },
            },
          }),
          citasProximas: { type: "array", items: ref("Cita") },
        },
      },
    ],
  },
};

// --- Las rutas ---

const paths = {
  "/salud": {
    get: {
      tags: ["Sistema"],
      summary: "Saber si el back está arriba",
      responses: { ...ok({ type: "object", properties: { ok: { const: true } } }, "Está arriba") },
    },
  },

  // Catálogo y disponibilidad
  "/api/servicios": {
    get: {
      tags: ["Catálogo"],
      summary: "Servicios que se ven en la web y en WhatsApp",
      parameters: page,
      responses: { ...list(ref("Servicio"), "Servicios activos, en orden de id"), ...errors({ 400: [validation] }) },
    },
  },
  "/api/barberos": {
    get: {
      tags: ["Catálogo"],
      summary: "Barberos que el cliente puede elegir",
      parameters: page,
      responses: { ...list(ref("Barbero"), "Barberos activos"), ...errors({ 400: [validation] }) },
    },
  },
  "/api/imagenes/{id}": {
    get: {
      tags: ["Catálogo"],
      summary: "Imagen subida desde el panel",
      description: "Es la única ruta que no responde con el sobre: devuelve la imagen tal cual, con caché de un año.",
      parameters: idPath,
      responses: {
        200: {
          description: "La imagen",
          content: Object.fromEntries(["image/jpeg", "image/png", "image/webp"].map((t) => [t, { schema: { type: "string", format: "binary" } }])),
        },
        ...errors({ 400: [validation], 404: [e(ErrorCode.ImageNotFound, "Imagen no encontrada")] }),
      },
    },
  },
  "/api/disponibilidad": {
    get: {
      tags: ["Disponibilidad"],
      summary: "Horas libres de un día para un servicio",
      description: "Sin barberoId junta las de todos y dice, por cada hora, quiénes pueden atender. No ofrece horas que empiecen en menos de 15 minutos.",
      parameters: [...query(availabilityQuery), ...page],
      responses: { ...list(ref("HoraDisponible"), "Horas libres en orden"), ...errors({ 400: [validation], 404: [serviceNotFound] }) },
    },
  },

  // Citas del cliente
  "/api/citas": {
    post: {
      tags: ["Citas"],
      summary: "Agendar una cita (web o WhatsApp)",
      description:
        "Desde la web hay que mandar cliente.aceptaDatos en true. Con sesión de cliente (cookie) la cita queda a su nombre y se ignoran el nombre y teléfono del formulario. Con la clave del agente (x-api-key) la cita queda por WhatsApp y no pide la autorización de datos. Cada cliente puede tener una sola cita activa.",
      security: [{}, { cookieAuth: [] }, { agentKey: [] }],
      requestBody: jsonBody(newAppointment),
      responses: {
        ...ok(ref("Cita"), "Cita agendada", 201),
        ...errors({
          400: [validation, invalidJson, e(ErrorCode.DataPolicyRequired, "Debes aceptar el tratamiento de datos personales"), timeInPast],
          404: [serviceNotFound],
          409: [
            slotTaken,
            e(ErrorCode.ActiveAppointmentExists, "Ya tienes una cita agendada. Cancélala o espera a que pase para reservar otra."),
          ],
        }),
      },
    },
  },
  "/api/citas/{id}": {
    get: {
      tags: ["Citas"],
      summary: "Ver una cita (solo el dueño)",
      description: "Si el teléfono no es el del dueño responde que no existe.",
      parameters: [...idPath, ...query(ownerPhoneQuery)],
      responses: { ...ok(ref("Cita"), "La cita en cualquier estado"), ...errors({ 400: [validation], 404: [appointmentNotFound] }) },
    },
  },
  "/api/citas/{id}/cancelar": {
    post: {
      tags: ["Citas"],
      summary: "Cancelar una cita (solo el dueño)",
      parameters: idPath,
      requestBody: jsonBody(ownerPhoneBody),
      responses: {
        ...ok(ref("Cita"), "Cita cancelada"),
        ...errors({ 400: [validation, invalidJson], 404: [appointmentNotFound], 409: [notActive] }),
      },
    },
  },
  "/api/citas/{id}/reprogramar": {
    post: {
      tags: ["Citas"],
      summary: "Cambiar la hora de una cita (solo el dueño)",
      description: "Queda con el mismo barbero y servicio.",
      parameters: idPath,
      requestBody: jsonBody(rescheduleBody),
      responses: {
        ...ok(ref("Cita"), "Cita con la hora nueva"),
        ...errors({ 400: [validation, invalidJson, timeInPast], 404: [appointmentNotFound], 409: [notActive, slotTaken] }),
      },
    },
  },

  // Cuentas
  "/api/cuenta/login": {
    post: {
      tags: ["Autenticación"],
      summary: "Iniciar sesión con teléfono y contraseña",
      description: "Si el teléfono es de alguien del equipo entra como BARBERO o ADMIN, si no como CLIENTE.",
      requestBody: jsonBody(loginBody),
      responses: {
        ...ok(ref("Sesion"), "Sesión iniciada. El JWT llega en la cookie httpOnly barberia_session, no en el cuerpo"),
        ...errors({ 400: [validation, invalidJson], 401: [e(ErrorCode.InvalidCredentials, "Teléfono o contraseña incorrectos")] }),
      },
    },
  },
  "/api/cuenta/registro": {
    post: {
      tags: ["Autenticación"],
      summary: "Crear cuenta de cliente",
      description: "Si ya había reservado sin cuenta, la cuenta queda en la misma ficha. descuentoPct es el descuento de bienvenida para su próxima cita.",
      requestBody: jsonBody(registerBody),
      responses: {
        ...ok(
          { allOf: [ref("Sesion"), { type: "object", properties: { descuentoPct: { type: "integer", example: 10 } } }] },
          "Cuenta creada y sesión iniciada",
          201,
        ),
        ...errors({
          400: [validation, invalidJson],
          409: [e(ErrorCode.PhoneAlreadyRegistered, "Ese teléfono ya tiene una cuenta. Inicia sesión.")],
        }),
      },
    },
  },
  "/api/cuenta/yo": {
    get: {
      tags: ["Perfil"],
      summary: "Datos de quien tiene la sesión",
      security: [{ cookieAuth: [] }],
      responses: { ...ok(ref("Usuario"), "Perfil"), ...errors({ 401: [authRequired] }) },
    },
    patch: {
      tags: ["Perfil"],
      summary: "Editar el perfil",
      description: "El cliente edita nombre y fechaNacimiento (null la borra). El equipo solo el nombre. El teléfono no se cambia.",
      security: [{ cookieAuth: [] }],
      requestBody: jsonBody(clientProfileBody),
      responses: { ...ok(ref("Usuario"), "Perfil actualizado"), ...errors({ 400: [validation, invalidJson], 401: [authRequired] }) },
    },
  },
  "/api/cuenta/logout": {
    post: {
      tags: ["Autenticación"],
      summary: "Cerrar sesión",
      security: [{ cookieAuth: [] }],
      responses: { ...empty("Sesión cerrada: se borra la cookie"), ...errors({ 401: [authRequired] }) },
    },
  },
  "/api/cuenta/yo/cita-activa": {
    get: {
      tags: ["Perfil"],
      summary: "Próxima cita del cliente con sesión",
      description: "También las que agendó por WhatsApp. Responde null si no tiene, o si la sesión es del equipo.",
      security: [{ cookieAuth: [] }],
      responses: { ...ok(nullable(ref("Cita")), "La cita activa o null"), ...errors({ 401: [authRequired] }) },
    },
  },

  // Agente de WhatsApp
  "/api/interno/contactos/{telefono}": {
    get: {
      tags: ["Agente de WhatsApp"],
      summary: "Quién está escribiendo",
      description: "Si es del equipo, el agente lo atiende en modo barbero. Si no, es un cliente (o null si nunca ha reservado) con sus próximas citas.",
      security: agent,
      parameters: [{ name: "telefono", in: "path", required: true, schema: { type: "string", example: "573101234567" } }],
      responses: { ...ok(ref("Contacto"), "El contacto"), ...errors({ 401: [invalidApiKey] }) },
    },
  },
  "/api/interno/agenda": {
    get: {
      tags: ["Agente de WhatsApp"],
      summary: "Agenda de un día, sin las canceladas",
      security: agent,
      parameters: [...query(agendaQuery), ...page],
      responses: { ...list(ref("Cita"), "Citas del día"), ...errors({ 400: [validation], 401: [invalidApiKey] }) },
    },
  },
  "/api/interno/bloqueos": {
    post: {
      tags: ["Agente de WhatsApp"],
      summary: "Bloquear horas de un barbero",
      security: agent,
      requestBody: jsonBody(timeBlockBody),
      responses: {
        ...ok(ref("Bloqueo"), "Bloqueo creado", 201),
        ...errors({
          400: [validation, invalidJson, invalidRange],
          401: [invalidApiKey],
          404: [e(ErrorCode.BarberNotFound, "Barbero no encontrado")],
        }),
      },
    },
  },

  // Panel
  "/api/panel/verificar": {
    get: {
      tags: ["Panel"],
      summary: "Saber si la sesión es del equipo",
      security: team,
      responses: { ...ok({ type: "object", properties: { ok: { const: true } } }, "Sí es del equipo"), ...errors({ 401: [teamOnly] }) },
    },
  },
  "/api/panel/citas": {
    get: {
      tags: ["Panel"],
      summary: "Citas del calendario entre dos fechas",
      description: "Las dos fechas incluidas, en cualquier estado.",
      security: team,
      parameters: [...query(dateRangeQuery), ...page],
      responses: { ...list(ref("Cita"), "Citas en orden de hora"), ...errors({ 400: [validation], 401: [teamOnly] }) },
    },
    post: {
      tags: ["Panel"],
      summary: "Cita de alguien que llega o llama",
      description: "Desde el panel sí se le pueden agendar varias citas al mismo cliente y no pide la autorización de datos.",
      security: team,
      requestBody: jsonBody(newAppointment),
      responses: {
        ...ok(ref("Cita"), "Cita agendada", 201),
        ...errors({ 400: [validation, invalidJson, timeInPast], 401: [teamOnly], 404: [serviceNotFound], 409: [slotTaken] }),
      },
    },
  },
  "/api/panel/citas/{id}/estado": {
    patch: {
      tags: ["Panel"],
      summary: "Cambiar el estado de una cita",
      security: team,
      parameters: idPath,
      requestBody: jsonBody(statusBody),
      responses: {
        ...ok(ref("Cita"), "La cita con su estado nuevo"),
        ...errors({ 400: [validation, invalidJson], 401: [teamOnly], 404: [appointmentNotFound] }),
      },
    },
  },
  "/api/panel/barberos": {
    get: {
      tags: ["Panel"],
      summary: "Todo el equipo con sus horarios",
      security: team,
      parameters: page,
      responses: { ...list(ref("MiembroEquipo"), "Barberos, también los inactivos"), ...errors({ 400: [validation], 401: [teamOnly] }) },
    },
  },
  "/api/panel/bloqueos": {
    get: {
      tags: ["Panel"],
      summary: "Bloqueos de todos los barberos entre dos fechas",
      security: team,
      parameters: [...query(timeBlockRangeQuery), ...page],
      responses: { ...list(ref("Bloqueo"), "Bloqueos en orden"), ...errors({ 400: [validation], 401: [teamOnly] }) },
    },
    post: {
      tags: ["Panel"],
      summary: "Bloquear horas de un barbero",
      security: team,
      requestBody: jsonBody(timeBlockBody),
      responses: {
        ...ok(ref("Bloqueo"), "Bloqueo creado", 201),
        ...errors({
          400: [validation, invalidJson, invalidRange],
          401: [teamOnly],
          404: [e(ErrorCode.BarberNotFound, "Barbero no encontrado")],
        }),
      },
    },
  },
  "/api/panel/bloqueos/{id}": {
    delete: {
      tags: ["Panel"],
      summary: "Quitar un bloqueo",
      security: team,
      parameters: idPath,
      responses: {
        ...empty("Bloqueo borrado"),
        ...errors({ 400: [validation], 401: [teamOnly], 404: [e(ErrorCode.TimeBlockNotFound, "Bloqueo no encontrado")] }),
      },
    },
  },

  // Servicios (solo admin)
  "/api/panel/servicios": {
    get: {
      tags: ["Servicios (admin)"],
      summary: "Todos los servicios, también los ocultos",
      security: team,
      parameters: page,
      responses: { ...list(ref("ServicioAdmin"), "Servicios con quién los creó y quién los cambió"), ...errors({ 400: [validation], 401: [teamOnly], 403: [adminOnly] }) },
    },
    post: {
      tags: ["Servicios (admin)"],
      summary: "Crear un servicio",
      description: "Queda guardado que lo creó el admin de la sesión.",
      security: team,
      requestBody: jsonBody(serviceBody),
      responses: {
        ...ok(ref("ServicioAdmin"), "Servicio creado", 201),
        ...errors({ 400: [validation, invalidJson], 401: [teamOnly], 403: [adminOnly] }),
      },
    },
  },
  "/api/panel/servicios/{id}": {
    patch: {
      tags: ["Servicios (admin)"],
      summary: "Editar, ocultar o mostrar un servicio",
      description: "Solo se cambian los campos que manden. Los servicios no se borran porque las citas pasadas los usan, se ocultan con activo en false.",
      security: team,
      parameters: idPath,
      requestBody: jsonBody(serviceBody.partial()),
      responses: {
        ...ok(ref("ServicioAdmin"), "Servicio actualizado"),
        ...errors({ 400: [validation, invalidJson], 401: [teamOnly], 403: [adminOnly], 404: [serviceNotFound] }),
      },
    },
  },
  "/api/panel/imagenes": {
    post: {
      tags: ["Servicios (admin)"],
      summary: "Subir una imagen",
      description: "El cuerpo es el archivo tal cual (no JSON), con su Content-Type. Máximo 3 MB. La url que devuelve va en imagenUrl del servicio.",
      security: team,
      requestBody: {
        required: true,
        content: Object.fromEntries(["image/jpeg", "image/png", "image/webp"].map((t) => [t, { schema: { type: "string", format: "binary" } }])),
      },
      responses: {
        ...ok({ type: "object", properties: { url: { type: "string", example: "/api/imagenes/3" } } }, "Imagen subida", 201),
        ...errors({
          400: [e(ErrorCode.InvalidImage, "Sube una imagen JPG, PNG o WebP")],
          401: [teamOnly],
          403: [adminOnly],
          413: [e(ErrorCode.PayloadTooLarge, "El archivo pesa más de lo permitido")],
        }),
      },
    },
  },
};

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "API Barbería",
    version: "1.0.0",
    description: [
      "API de la agenda de la barbería: web del cliente, panel del equipo y agente de WhatsApp.",
      "",
      "**Todas las respuestas** vienen en el mismo sobre: `{ success, data, error }`, y las listas además con `pagination { page, perPage, total }`.",
      "Las listas se piden con `?page=1&perPage=20` (máximo 100). Los errores traen un `code` fijo y un `message` en español.",
      "",
      "**Autenticación**: `POST /api/cuenta/login` deja un JWT en la cookie httpOnly `barberia_session` y el navegador la manda solo en cada petición, también desde esta página. La sesión dura 30 minutos y cada petición le da otros 30: se cierra sola si pasa media hora sin actividad. El agente usa el header `x-api-key`.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "Este mismo servidor" }],
  tags: [
    { name: "Autenticación", description: "Iniciar sesión, crear cuenta y cerrar sesión. Al iniciar sesión aquí mismo, las demás rutas ya quedan con la cookie" },
    { name: "Perfil", description: "Con sesión (cookie)" },
    { name: "Catálogo" },
    { name: "Disponibilidad" },
    { name: "Citas", description: "Lo que hace el cliente con su cita" },
    { name: "Panel", description: "Con sesión de un barbero o del admin" },
    { name: "Servicios (admin)", description: "Solo el admin" },
    { name: "Agente de WhatsApp", description: "Solo con la clave del agente (x-api-key)" },
    { name: "Sistema" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "barberia_session",
        description: "JWT de la sesión. La pone /api/cuenta/login y el navegador la manda solo",
      },
      agentKey: { type: "apiKey", in: "header", name: "x-api-key", description: "Clave del agente de WhatsApp (secreto AGENTE_API_KEY)" },
    },
    schemas,
  },
  paths,
};
