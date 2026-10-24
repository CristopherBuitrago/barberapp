import type { Barber } from "../entities/Barber.js";
import type { Page, PageRequest } from "./Pagination.js";

/** Los barberos siempre vienen con sus jornadas. */
export interface BarberRepository {
  /** Los activos en orden de id, o solo uno si mandan barberId */
  findActive(barberId?: number): Promise<Barber[]>;
  /** Todos, también los inactivos */
  findAll(): Promise<Barber[]>;
  /** Lo mismo pero por páginas, para el panel */
  listAll(page: PageRequest): Promise<Page<Barber>>;
  findById(id: number): Promise<Barber | null>;
  findActiveByPhone(phone: string): Promise<Barber | null>;
  /** Cualquiera con ese teléfono, esté activo o no. exceptId es para no contarse a sí mismo al editar */
  existsWithPhone(phone: string, exceptId?: number): Promise<boolean>;
  /** Sin importar mayúsculas */
  findByName(name: string): Promise<Barber | null>;
  /** Si otro ya se llama así, sin importar mayúsculas, tildes ni espacios (ver nameKey) */
  existsWithName(name: string, exceptId?: number): Promise<boolean>;
  /** Guarda los datos del barbero con su semana de jornadas tal como la tenga */
  save(barber: Barber): Promise<Barber>;
}
