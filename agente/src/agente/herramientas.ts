import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { BarberiaApi, Cita } from "../backend/BarberiaApi.js";
import { aIso, describirInicio } from "./fechas.js";

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Fecha en formato YYYY-MM-DD");
const hora = z.string().regex(/^\d{2}:\d{2}$/).describe("Hora local en formato HH:MM (24 h)");

interface Herramienta {
  definicion: Anthropic.Beta.BetaTool;
  ejecutar: (input: unknown) => Promise<string>;
}

function herramienta<T extends z.ZodObject>(
  name: string,
  description: string,
  esquema: T,
  run: (input: z.infer<T>) => Promise<unknown>,
): Herramienta {
  const { $schema: _omitido, ...inputSchema } = z.toJSONSchema(esquema) as Record<string, unknown>;
  return {
    definicion: {
      name,
      description,
      input_schema: inputSchema as Anthropic.Beta.BetaTool.InputSchema,
    },
    ejecutar: async (input) => {
      const resultado = await run(esquema.parse(input));
      return typeof resultado === "string" ? resultado : JSON.stringify(resultado);
    },
  };
}

function resumirCita(c: Cita) {
  return {
    cita_id: c.id,
    cuando: describirInicio(c.inicio),
    servicio: c.servicio.nombre,
    barbero: c.barbero.nombre,
    cliente: c.cliente.nombre,
    precio: c.precioFinal,
    ...(c.descuentoPct ? { descuento: `${c.descuentoPct}%` } : {}),
    estado: c.estado,
  };
}

export interface ContextoHerramientas {
  api: BarberiaApi;
  /** Teléfono de WhatsApp de quien escribe. Nunca lo decide el modelo. */
  telefono: string;
  pasarAHumano: (motivo: string) => Promise<void>;
}

export function herramientasCliente(ctx: ContextoHerramientas): Herramienta[] {
  const { api, telefono } = ctx;
  return [
    herramienta(
      "ver_servicios_y_barberos",
      "Lista los servicios (con id, precio en pesos y duración) y los barberos activos.",
      z.object({}),
      async () => ({ servicios: await api.servicios(), barberos: await api.barberos() }),
    ),
    herramienta(
      "consultar_disponibilidad",
      "Horas libres de un día para un servicio. Si se indica barbero_id, solo las de ese barbero; si no, cada hora trae qué barberos están libres.",
      z.object({
        servicio_id: z.number().int(),
        fecha,
        barbero_id: z.number().int().optional(),
      }),
      async (i) => {
        const horas = await api.disponibilidad(i.servicio_id, i.fecha, i.barbero_id);
        if (horas.length === 0) return "No hay horas libres ese día.";
        return horas.map((h) => `${h.inicio.slice(11, 16)} (${h.barberos.map((b) => `${b.nombre}#${b.id}`).join(", ")})`).join("\n");
      },
    ),
    herramienta(
      "agendar_cita",
      "Crea la cita. Úsala solo después de que el cliente confirme servicio, día, hora y barbero.",
      z.object({
        servicio_id: z.number().int(),
        fecha,
        hora,
        barbero_id: z.number().int().optional().describe("Omitir si al cliente le da igual el barbero"),
        nombre_cliente: z.string().min(1),
      }),
      async (i) =>
        resumirCita(
          await api.crearCita({
            servicioId: i.servicio_id,
            barberoId: i.barbero_id,
            inicio: aIso(i.fecha, i.hora),
            cliente: { nombre: i.nombre_cliente, telefono, aceptaDatos: true },
          }),
        ),
    ),
    herramienta(
      "mis_citas",
      "Próximas citas agendadas de este cliente.",
      z.object({}),
      async () => {
        const contacto = await api.contacto(telefono);
        if (contacto.tipo !== "cliente" || contacto.citasProximas.length === 0) {
          return "No tiene citas próximas.";
        }
        return contacto.citasProximas.map(resumirCita);
      },
    ),
    herramienta(
      "cancelar_cita",
      "Cancela una cita del cliente. Confirma antes con el cliente cuál cita.",
      z.object({ cita_id: z.number().int() }),
      async (i) => resumirCita(await api.cancelarCita(i.cita_id, telefono)),
    ),
    herramienta(
      "reprogramar_cita",
      "Mueve una cita del cliente a otra hora con el mismo barbero. Verifica antes la disponibilidad.",
      z.object({ cita_id: z.number().int(), fecha, hora }),
      async (i) => resumirCita(await api.reprogramarCita(i.cita_id, telefono, aIso(i.fecha, i.hora))),
    ),
    herramienta(
      "pasar_a_humano",
      "Avisa al equipo de la barbería para que una persona siga la conversación. El asistente deja de responder a este cliente por un rato.",
      z.object({ motivo: z.string().describe("Resumen corto de lo que necesita el cliente") }),
      async (i) => {
        await ctx.pasarAHumano(i.motivo);
        return "Listo, el equipo ya fue avisado.";
      },
    ),
  ];
}

export function herramientasBarbero(api: BarberiaApi, barberoId: number): Herramienta[] {
  return [
    herramienta(
      "ver_agenda",
      "Citas de un día. Por defecto solo las del barbero que escribe; con toda_la_barberia=true, las de todos.",
      z.object({ fecha, toda_la_barberia: z.boolean().optional() }),
      async (i) => {
        const citas = await api.agenda(i.fecha, i.toda_la_barberia ? undefined : barberoId);
        if (citas.length === 0) return "No hay citas ese día.";
        return citas.map(resumirCita);
      },
    ),
    herramienta(
      "bloquear_horario",
      "Bloquea un rango de horas del barbero que escribe para que no le agenden.",
      z.object({ fecha, hora_inicio: hora, hora_fin: hora, motivo: z.string().optional() }),
      async (i) => {
        await api.bloquear(barberoId, aIso(i.fecha, i.hora_inicio), aIso(i.fecha, i.hora_fin), i.motivo ?? "");
        return `Bloqueado ${i.fecha} de ${i.hora_inicio} a ${i.hora_fin}.`;
      },
    ),
  ];
}
