import type { Client } from "../entities/Client.js";

export interface ClientRepository {
  findByPhone(phone: string): Promise<Client | null>;
  /**
   * Busca al cliente por teléfono o lo crea al reservar. Si ya existía le actualiza el
   * nombre, y la autorización de datos solo se marca, nunca se quita.
   */
  upsertForBooking(data: { phone: string; name: string; acceptsDataPolicy: boolean }): Promise<Client>;
  /** Crea la cuenta, o se la pone a la ficha que ya tenía si había reservado antes */
  saveRegistration(data: {
    phone: string;
    name: string;
    passwordHash: string;
    birthDate: Date | null;
  }): Promise<Client>;
  /** birthDate en undefined lo deja como está */
  updateProfile(id: number, data: { name: string; birthDate?: Date | null }): Promise<Client>;
  markWelcomeDiscountUsed(id: number): Promise<void>;
}
