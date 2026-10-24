import type { Service } from "../../../domain/entities/Service.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";
import type { Db } from "./client.js";
import { serviceInclude, toService } from "./mappers.js";

export class PrismaServiceRepository implements ServiceRepository {
  constructor(private readonly db: Db) {}

  async findActive(): Promise<Service[]> {
    const rows = await this.db.servicio.findMany({ where: { activo: true }, include: serviceInclude, orderBy: { id: "asc" } });
    return rows.map(toService);
  }

  async findActiveById(id: number): Promise<Service | null> {
    const row = await this.db.servicio.findFirst({ where: { id, activo: true }, include: serviceInclude });
    return row && toService(row);
  }

  async findAll(): Promise<Service[]> {
    const rows = await this.db.servicio.findMany({ include: serviceInclude, orderBy: { id: "asc" } });
    return rows.map(toService);
  }

  async findById(id: number): Promise<Service | null> {
    const row = await this.db.servicio.findUnique({ where: { id }, include: serviceInclude });
    return row && toService(row);
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
