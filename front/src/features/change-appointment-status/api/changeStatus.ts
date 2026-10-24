import { toAppointment, type Appointment, type AppointmentDto, type AppointmentStatus } from "@/entities/appointment";
import { http } from "@/shared/api";

export async function changeStatus(appointmentId: number, status: AppointmentStatus): Promise<Appointment> {
  return toAppointment(await http.patch<AppointmentDto>(`/panel/citas/${appointmentId}/estado`, { estado: status }));
}
