import type { Appointment } from "../../domain/entities/Appointment.js";
import type { Barber } from "../../domain/entities/Barber.js";
import type { Client } from "../../domain/entities/Client.js";

/** Quién le escribe al agente de WhatsApp. */
export type Contact =
  | { kind: "barber"; barber: Barber }
  | { kind: "client"; client: Client | null; pendingDiscountPct: number; upcomingAppointments: Appointment[] };
