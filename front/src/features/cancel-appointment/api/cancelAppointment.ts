import { toAppointment, type Appointment, type AppointmentDto } from "@/entities/appointment";
import { http } from "@/shared/api";

/** Solo el dueño cancela, por eso va su teléfono */
export async function cancelAppointment(appointmentId: number, ownerPhone: string): Promise<Appointment> {
  return toAppointment(await http.post<AppointmentDto>(`/citas/${appointmentId}/cancelar`, { telefono: ownerPhone }));
}
