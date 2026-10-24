export type { Appointment, AppointmentStatus, BookingChannel, NewAppointment } from "./model/types";
export { CHANNEL_LABEL, STATUS_LABEL, isActive } from "./lib/rules";
export {
  getActiveAppointment,
  getAppointment,
  getPanelAppointments,
  toAppointment,
  toNewAppointmentBody,
  type AppointmentDto,
} from "./api/appointmentApi";
