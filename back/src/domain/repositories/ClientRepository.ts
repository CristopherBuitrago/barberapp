import type { Client } from "../entities/Client.js";

export interface ClientRepository {
  findById(id: number): Promise<Client | null>;
  findByPhone(phone: string): Promise<Client | null>;
  /** Si es nuevo lo crea, si no lo actualiza. Devuelve cómo quedó en la base */
  save(client: Client): Promise<Client>;
}
