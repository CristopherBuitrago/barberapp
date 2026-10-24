import type { Barber } from "../../../domain/entities/Barber.js";
import { offsetOf, type Page, type PageRequest } from "../../../domain/repositories/Pagination.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { Db } from "./client.js";
import { barberInclude, toBarber } from "./mappers.js";

export class PrismaBarberRepository implements BarberRepository {
  constructor(private readonly db: Db) {}

  async findActive(barberId?: number): Promise<Barber[]> {
    const rows = await this.db.barbero.findMany({
      where: { activo: true, ...(barberId ? { id: barberId } : {}) },
      include: barberInclude,
      orderBy: { id: "asc" },
    });
    return rows.map(toBarber);
  }

  async findAll(): Promise<Barber[]> {
    const rows = await this.db.barbero.findMany({ include: barberInclude, orderBy: { id: "asc" } });
    return rows.map(toBarber);
  }

  async listAll(page: PageRequest): Promise<Page<Barber>> {
    const [rows, total] = await Promise.all([
      this.db.barbero.findMany({ include: barberInclude, orderBy: { id: "asc" }, skip: offsetOf(page), take: page.perPage }),
      this.db.barbero.count(),
    ]);
    return { items: rows.map(toBarber), total };
  }

  async findById(id: number): Promise<Barber | null> {
    const row = await this.db.barbero.findUnique({ where: { id }, include: barberInclude });
    return row && toBarber(row);
  }

  async findActiveByPhone(phone: string): Promise<Barber | null> {
    const row = await this.db.barbero.findFirst({ where: { telefono: phone, activo: true }, include: barberInclude });
    return row && toBarber(row);
  }

  async existsWithPhone(phone: string): Promise<boolean> {
    return (await this.db.barbero.count({ where: { telefono: phone } })) > 0;
  }

  async findByName(name: string): Promise<Barber | null> {
    const row = await this.db.barbero.findFirst({
      where: { nombre: { equals: name, mode: "insensitive" } },
      include: barberInclude,
    });
    return row && toBarber(row);
  }

  async save(barber: Barber): Promise<Barber> {
    const data = {
      nombre: barber.name,
      telefono: barber.phone,
      activo: barber.active,
      claveHash: barber.passwordHash,
      esAdmin: barber.isAdmin,
    };
    const row = barber.isNew
      ? await this.db.barbero.create({ data, include: barberInclude })
      : await this.db.barbero.update({ where: { id: barber.id }, data, include: barberInclude });
    return toBarber(row);
  }
}
