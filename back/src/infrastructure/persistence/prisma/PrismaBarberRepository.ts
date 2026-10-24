import type { Barber, BarberWithSchedules, WorkSchedule } from "../../../domain/entities/Barber.js";
import type { BarberRepository, WorkScheduleRepository } from "../../../domain/repositories/BarberRepository.js";
import type { Db } from "./client.js";
import { toBarber, toWorkSchedule } from "./mappers.js";

export class PrismaBarberRepository implements BarberRepository {
  constructor(private readonly db: Db) {}

  async findActive(barberId?: number): Promise<Barber[]> {
    const rows = await this.db.barbero.findMany({
      where: { activo: true, ...(barberId ? { id: barberId } : {}) },
      orderBy: { id: "asc" },
    });
    return rows.map(toBarber);
  }

  async findAllWithSchedules(): Promise<BarberWithSchedules[]> {
    const rows = await this.db.barbero.findMany({ include: { horarios: true }, orderBy: { id: "asc" } });
    return rows.map((row) => ({ ...toBarber(row), schedules: row.horarios.map(toWorkSchedule) }));
  }

  async findActiveByPhone(phone: string): Promise<Barber | null> {
    const row = await this.db.barbero.findFirst({ where: { telefono: phone, activo: true } });
    return row && toBarber(row);
  }

  async existsWithPhone(phone: string): Promise<boolean> {
    return (await this.db.barbero.count({ where: { telefono: phone } })) > 0;
  }

  async findByName(name: string): Promise<Barber | null> {
    const row = await this.db.barbero.findFirst({ where: { nombre: { equals: name, mode: "insensitive" } } });
    return row && toBarber(row);
  }

  async updateName(id: number, name: string): Promise<Barber> {
    return toBarber(await this.db.barbero.update({ where: { id }, data: { nombre: name } }));
  }

  async setAccount(id: number, data: { phone: string; passwordHash: string; isAdmin: boolean }): Promise<Barber> {
    const row = await this.db.barbero.update({
      where: { id },
      data: { telefono: data.phone, claveHash: data.passwordHash, esAdmin: data.isAdmin },
    });
    return toBarber(row);
  }
}

export class PrismaWorkScheduleRepository implements WorkScheduleRepository {
  constructor(private readonly db: Db) {}

  async findByWeekday(weekday: number, barberIds: number[]): Promise<WorkSchedule[]> {
    const rows = await this.db.horarioBarbero.findMany({
      where: { diaSemana: weekday, barberoId: { in: barberIds } },
      orderBy: { id: "asc" },
    });
    return rows.map(toWorkSchedule);
  }
}
