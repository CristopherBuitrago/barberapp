import { toBarber, type BarberDto } from "@/entities/barber/@x/appointment";
import { http } from "@/shared/api";
import type { Appointment, AppointmentStatus, BookingChannel, NewAppointment } from "../model/types";

/** Como la manda la API */
export interface AppointmentDto {
  id: number;
  inicio: string;
  fin: string;
  estado: AppointmentStatus;
  canal: BookingChannel;
  precio: number;
  descuentoPct: number;
  precioFinal: number;
  notas: string;
  barbero: BarberDto;
  servicio: { id: number; nombre: string; duracionMin: number };
  cliente: { id: number; nombre: string; telefono: string };
}

export function toAppointment(dto: AppointmentDto): Appointment {
  return {
    id: dto.id,
    start: dto.inicio,
    end: dto.fin,
    status: dto.estado,
    channel: dto.canal,
    price: dto.precio,
    discountPct: dto.descuentoPct,
    finalPrice: dto.precioFinal,
    notes: dto.notas,
    barber: toBarber(dto.barbero),
    service: { id: dto.servicio.id, name: dto.servicio.nombre, durationMin: dto.servicio.duracionMin },
    client: { id: dto.cliente.id, name: dto.cliente.nombre, phone: dto.cliente.telefono },
  };
}

/** Al revés: la cita nueva como la espera la API */
export function toNewAppointmentBody(appointment: NewAppointment) {
  return {
    servicioId: appointment.serviceId,
    barberoId: appointment.barberId,
    inicio: appointment.start,
    cliente: {
      nombre: appointment.client.name,
      telefono: appointment.client.phone,
      aceptaDatos: appointment.client.acceptsDataPolicy,
    },
  };
}

/** Una cita, solo con el teléfono del dueño */
export async function getAppointment(id: number, phone: string): Promise<Appointment> {
  return toAppointment(await http.get<AppointmentDto>(`/citas/${id}?telefono=${encodeURIComponent(phone)}`));
}

/** La próxima cita del cliente con sesión, también las que agendó por WhatsApp */
export async function getActiveAppointment(): Promise<Appointment | null> {
  const dto = await http.get<AppointmentDto | null>("/cuenta/yo/cita-activa");
  return dto && toAppointment(dto);
}

/** Citas del calendario del panel entre dos fechas, las dos incluidas */
export async function getPanelAppointments(from: string, to: string): Promise<Appointment[]> {
  return (await http.getAll<AppointmentDto>(`/panel/citas?desde=${from}&hasta=${to}`)).map(toAppointment);
}
