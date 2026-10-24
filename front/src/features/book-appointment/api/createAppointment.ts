import { toAppointment, toNewAppointmentBody, type Appointment, type AppointmentDto, type NewAppointment } from "@/entities/appointment";
import { http } from "@/shared/api";

/** Reserva desde la web. Con sesión de cliente el back la deja a su nombre */
export async function createAppointment(appointment: NewAppointment): Promise<Appointment> {
  return toAppointment(await http.post<AppointmentDto>("/citas", toNewAppointmentBody(appointment)));
}
