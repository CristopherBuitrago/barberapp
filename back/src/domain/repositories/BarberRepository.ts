import type { Barber, BarberWithSchedules, WorkSchedule } from "../entities/Barber.js";

export interface BarberRepository {
  /** Los activos, en orden de id */
  findActive(barberId?: number): Promise<Barber[]>;
  /** Todos, también los inactivos, con sus horarios (para el panel) */
  findAllWithSchedules(): Promise<BarberWithSchedules[]>;
  findActiveByPhone(phone: string): Promise<Barber | null>;
  /** Cualquiera con ese teléfono, esté activo o no */
  existsWithPhone(phone: string): Promise<boolean>;
  /** Sin importar mayúsculas */
  findByName(name: string): Promise<Barber | null>;
  updateName(id: number, name: string): Promise<Barber>;
  /** Le pone o le cambia la cuenta del panel: teléfono, contraseña y si es admin */
  setAccount(id: number, data: { phone: string; passwordHash: string; isAdmin: boolean }): Promise<Barber>;
}

export interface WorkScheduleRepository {
  findByWeekday(weekday: number, barberIds: number[]): Promise<WorkSchedule[]>;
}
