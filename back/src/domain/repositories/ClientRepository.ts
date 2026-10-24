import type { AppointmentStatus } from "../entities/Appointment.js";
import type { Client } from "../entities/Client.js";
import type { Page, PageRequest } from "./Pagination.js";

/** El cliente con un resumen de sus citas, para la lista del panel */
export interface ClientWithHistory {
  client: Client;
  /** Todas, también las canceladas */
  appointmentCount: number;
  /** La de fecha más reciente, sea cual sea su estado */
  lastAppointment: { start: Date; status: AppointmentStatus } | null;
}

export interface ClientRepository {
  findById(id: number): Promise<Client | null>;
  findByPhone(phone: string): Promise<Client | null>;
  /**
   * Los clientes en orden de nombre. Con search se buscan los que tengan eso en el
   * nombre (sin importar mayúsculas) o, si son números, en el teléfono
   */
  search(search: string | undefined, page: PageRequest): Promise<Page<ClientWithHistory>>;
  /** Si es nuevo lo crea, si no lo actualiza. Devuelve cómo quedó en la base */
  save(client: Client): Promise<Client>;
}
