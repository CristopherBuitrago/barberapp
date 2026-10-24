import type { BookingChannel } from "../../domain/entities/Appointment.js";
import type { Client } from "../../domain/entities/Client.js";

export interface CreateAppointmentInput {
  serviceId: number;
  /** Sin barbero se le asigna el primero que esté libre */
  barberId?: number;
  start: Date;
  client: { name: string; phone: string; acceptsDataPolicy?: boolean };
  channel: BookingChannel;
  notes?: string;
  /** Si reserva un cliente con sesión en la web, la cita queda a su nombre */
  sessionClient?: Client;
}

export interface OwnerAppointmentInput {
  appointmentId: number;
  /** El teléfono del dueño, así nadie más puede ver o tocar la cita */
  phone: string;
}

export interface RescheduleAppointmentInput extends OwnerAppointmentInput {
  start: Date;
}
