import type { Client } from "../../../domain/entities/Client.js";
import type { ClientRepository } from "../../../domain/repositories/ClientRepository.js";
import type { Db } from "./client.js";
import { toClient } from "./mappers.js";

export class PrismaClientRepository implements ClientRepository {
  constructor(private readonly db: Db) {}

  async findByPhone(phone: string): Promise<Client | null> {
    const row = await this.db.cliente.findUnique({ where: { telefono: phone } });
    return row && toClient(row);
  }

  async upsertForBooking(data: { phone: string; name: string; acceptsDataPolicy: boolean }): Promise<Client> {
    const row = await this.db.cliente.upsert({
      where: { telefono: data.phone },
      create: { telefono: data.phone, nombre: data.name, aceptaDatos: data.acceptsDataPolicy },
      // La autorización de datos solo se marca, nunca se quita al volver a reservar
      update: { nombre: data.name, ...(data.acceptsDataPolicy ? { aceptaDatos: true } : {}) },
    });
    return toClient(row);
  }

  async saveRegistration(data: {
    phone: string;
    name: string;
    passwordHash: string;
    birthDate: Date | null;
  }): Promise<Client> {
    const fields = {
      nombre: data.name,
      registrado: true,
      aceptaDatos: true,
      claveHash: data.passwordHash,
      fechaNacimiento: data.birthDate,
    };
    const row = await this.db.cliente.upsert({
      where: { telefono: data.phone },
      create: { telefono: data.phone, ...fields },
      update: fields,
    });
    return toClient(row);
  }

  async updateProfile(id: number, data: { name: string; birthDate?: Date | null }): Promise<Client> {
    const row = await this.db.cliente.update({
      where: { id },
      data: { nombre: data.name, ...(data.birthDate !== undefined && { fechaNacimiento: data.birthDate }) },
    });
    return toClient(row);
  }

  async markWelcomeDiscountUsed(id: number): Promise<void> {
    await this.db.cliente.update({ where: { id }, data: { descuentoBienvenidaUsado: true } });
  }
}
