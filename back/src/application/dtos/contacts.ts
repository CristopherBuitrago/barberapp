import type { AppointmentDetail } from "../../domain/entities/Appointment.js";
import type { BarberSummary } from "../../domain/entities/Barber.js";

/** Quién le escribe al agente de WhatsApp. */
export type Contact =
  | { kind: "barber"; barber: BarberSummary }
  | {
      kind: "client";
      client: { name: string; registered: boolean; pendingDiscountPct: number } | null;
      upcomingAppointments: AppointmentDetail[];
    };
