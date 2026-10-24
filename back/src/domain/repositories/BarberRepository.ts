import type { Barber } from "../entities/Barber.js";

/** Los barberos siempre vienen con sus jornadas. */
export interface BarberRepository {
  /** Los activos en orden de id, o solo uno si mandan barberId */
  findActive(barberId?: number): Promise<Barber[]>;
  /** Todos, también los inactivos */
  findAll(): Promise<Barber[]>;
  findById(id: number): Promise<Barber | null>;
  findActiveByPhone(phone: string): Promise<Barber | null>;
  /** Cualquiera con ese teléfono, esté activo o no */
  existsWithPhone(phone: string): Promise<boolean>;
  /** Sin importar mayúsculas */
  findByName(name: string): Promise<Barber | null>;
  /** Guarda los datos del barbero. Las jornadas todavía no se editan desde la app */
  save(barber: Barber): Promise<Barber>;
}
