import { toAppointment, toNewAppointmentBody, type Appointment, type AppointmentDto, type NewAppointment } from "@/entities/appointment";
import { http } from "@/shared/api";

/** Cita de alguien que llega o llama. Desde el panel no pide la autorización de datos */
export async function createPanelAppointment(appointment: NewAppointment): Promise<Appointment> {
  return toAppointment(await http.post<AppointmentDto>("/panel/citas", toNewAppointmentBody(appointment)));
}
