/**
 * Validación de lo que llega por HTTP. Los nombres de los campos son los de la API,
 * que siguen en español porque así los usan el front y el agente.
 */
import { z } from "zod";
import { AppointmentStatus } from "../../../domain/entities/Appointment.js";

// Los mensajes de validación que zod pone solo también salen en español
z.config(z.locales.es());

export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD");
export const instant = z.iso.datetime({ offset: true }).transform((s) => new Date(s));
export const id = z.coerce.number().int().positive();
export const phone = z.string().min(7).max(20);
const name = z.string().trim().min(1).max(80);
const password = z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100);

export const idParam = z.object({ id });

export const MAX_PER_PAGE = 100;

/** ?page=1&perPage=20 en todas las listas. Si no los mandan, primera página de 20 */
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(MAX_PER_PAGE).default(20),
});

export const newAppointment = z.object({
  servicioId: id,
  barberoId: id.optional(),
  inicio: instant,
  cliente: z.object({
    nombre: name,
    telefono: phone,
    aceptaDatos: z.boolean().optional(),
  }),
  notas: z.string().max(300).optional(),
});

export const availabilityQuery = z.object({ servicioId: id, fecha: date, barberoId: id.optional() });
export const ownerPhoneQuery = z.object({ telefono: phone });
export const ownerPhoneBody = z.object({ telefono: phone });
export const rescheduleBody = z.object({ telefono: phone, inicio: instant });

export const loginBody = z.object({ telefono: phone, clave: z.string().min(1) });
export const registerBody = z.object({
  nombre: name,
  telefono: phone,
  clave: password,
  fechaNacimiento: date.optional(),
  aceptaDatos: z.literal(true, { error: "Debes aceptar el tratamiento de datos" }),
});
export const clientProfileBody = z.object({ nombre: name, fechaNacimiento: date.nullable().optional() });
export const teamProfileBody = z.object({ nombre: name });

export const dateRangeQuery = z.object({ desde: date, hasta: date, barberoId: id.optional() });
/** Los bloqueos del panel se traen de todos los barberos, solo con el rango de fechas */
export const timeBlockRangeQuery = dateRangeQuery.pick({ desde: true, hasta: true });
export const agendaQuery = z.object({ fecha: date, barberoId: id.optional() });
export const statusBody = z.object({
  estado: z.enum([
    AppointmentStatus.Scheduled,
    AppointmentStatus.Cancelled,
    AppointmentStatus.Completed,
    AppointmentStatus.NoShow,
  ]),
});
export const timeBlockBody = z.object({
  barberoId: id,
  inicio: instant,
  fin: instant,
  motivo: z.string().max(120).optional(),
});

export const serviceBody = z.object({
  nombre: z.string().trim().min(1).max(60),
  descripcion: z.string().trim().max(300),
  duracionMin: z.number().int().min(5).max(480),
  precio: z.number().int().min(0),
  imagenUrl: z.string().max(300).nullable(),
  activo: z.boolean(),
});
