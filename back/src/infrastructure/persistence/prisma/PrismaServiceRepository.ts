import type { Service } from "../../../domain/entities/Service.js";
import { offsetOf, type Page, type PageRequest } from "../../../domain/repositories/Pagination.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";
import { nameKey } from "../../../domain/value-objects/NameKey.js";
import type { Db } from "./client.js";
import { serviceInclude, toService } from "./mappers.js";

export class PrismaServiceRepository implements ServiceRepository {
  constructor(private readonly db: Db) {}

  findActive(page: PageRequest): Promise<Page<Service>> {
    return this.list({ activo: true }, page);
  }

  async findActiveById(id: number): Promise<Service | null> {
    const row = await this.db.servicio.findFirst({ where: { id, activo: true }, include: serviceInclude });
    return row && toService(row);
  }

  findAll(page: PageRequest): Promise<Page<Service>> {
    return this.list({}, page);
  }

  private async list(where: { activo?: boolean }, page: PageRequest): Promise<Page<Service>> {
    const [rows, total] = await Promise.all([
      this.db.servicio.findMany({
        where,
        include: serviceInclude,
        orderBy: { id: "asc" },
        skip: offsetOf(page),
        take: page.perPage,
      }),
      this.db.servicio.count({ where }),
    ]);
    return { items: rows.map(toService), total };
  }

  async findById(id: number): Promise<Service | null> {
    const row = await this.db.servicio.findUnique({ where: { id }, include: serviceInclude });
    return row && toService(row);
  }

  async existsWithName(name: string, exceptId?: number): Promise<boolean> {
    // El catálogo es corto, se compara aquí porque la base no quita tildes sola
    const rows = await this.db.servicio.findMany({ select: { id: true, nombre: true } });
    return rows.some((r) => r.id !== exceptId && nameKey(r.nombre) === nameKey(name));
  }

  async save(service: Service): Promise<Service> {
    const data = {
      nombre: service.name,
      descripcion: service.description,
      duracionMin: service.durationMin,
      precio: service.price,
      imagenUrl: service.imageUrl,
      activo: service.active,
      actualizadoPorId: service.updatedBy?.id ?? null,
    };
    const row = service.isNew
      ? await this.db.servicio.create({
          data: { ...data, creadoPorId: service.createdBy?.id ?? null, creadoEn: service.createdAt },
          include: serviceInclude,
        })
      : await this.db.servicio.update({ where: { id: service.id }, data, include: serviceInclude });
    return toService(row);
  }
}
