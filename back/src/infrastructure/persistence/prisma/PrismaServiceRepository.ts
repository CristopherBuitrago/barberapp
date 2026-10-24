import type { Service, ServiceData, ServiceWithAuthors } from "../../../domain/entities/Service.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";
import type { Db } from "./client.js";
import { serviceAuthorsInclude, toService, toServiceWithAuthors } from "./mappers.js";

function toRow(data: Partial<ServiceData>) {
  return {
    nombre: data.name,
    descripcion: data.description,
    duracionMin: data.durationMin,
    precio: data.price,
    imagenUrl: data.imageUrl,
    activo: data.active,
  };
}

export class PrismaServiceRepository implements ServiceRepository {
  constructor(private readonly db: Db) {}

  async findActive(): Promise<Service[]> {
    const rows = await this.db.servicio.findMany({ where: { activo: true }, orderBy: { id: "asc" } });
    return rows.map(toService);
  }

  async findActiveById(id: number): Promise<Service | null> {
    const row = await this.db.servicio.findFirst({ where: { id, activo: true } });
    return row && toService(row);
  }

  async findAllWithAuthors(): Promise<ServiceWithAuthors[]> {
    const rows = await this.db.servicio.findMany({ include: serviceAuthorsInclude, orderBy: { id: "asc" } });
    return rows.map(toServiceWithAuthors);
  }

  async exists(id: number): Promise<boolean> {
    return (await this.db.servicio.count({ where: { id } })) > 0;
  }

  async create(data: ServiceData, authorId: number): Promise<ServiceWithAuthors> {
    const row = await this.db.servicio.create({
      data: {
        nombre: data.name,
        descripcion: data.description,
        duracionMin: data.durationMin,
        precio: data.price,
        imagenUrl: data.imageUrl,
        activo: data.active,
        creadoPorId: authorId,
        actualizadoPorId: authorId,
      },
      include: serviceAuthorsInclude,
    });
    return toServiceWithAuthors(row);
  }

  async update(id: number, data: Partial<ServiceData>, authorId: number): Promise<ServiceWithAuthors> {
    const row = await this.db.servicio.update({
      where: { id },
      data: { ...toRow(data), actualizadoPorId: authorId },
      include: serviceAuthorsInclude,
    });
    return toServiceWithAuthors(row);
  }
}
