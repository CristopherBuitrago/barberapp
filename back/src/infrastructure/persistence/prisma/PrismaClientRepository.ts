import type { Client } from "../../../domain/entities/Client.js";
import type { ClientRepository } from "../../../domain/repositories/ClientRepository.js";
import type { Db } from "./client.js";
import { toClient } from "./mappers.js";

export class PrismaClientRepository implements ClientRepository {
  constructor(private readonly db: Db) {}

  async findById(id: number): Promise<Client | null> {
    const row = await this.db.cliente.findUnique({ where: { id } });
    return row && toClient(row);
  }

  async findByPhone(phone: string): Promise<Client | null> {
    const row = await this.db.cliente.findUnique({ where: { telefono: phone } });
    return row && toClient(row);
  }

  async save(client: Client): Promise<Client> {
    const data = {
      nombre: client.name,
      fechaNacimiento: client.birthDate,
      registrado: client.registered,
      aceptaDatos: client.acceptsDataPolicy,
      descuentoBienvenidaUsado: client.welcomeDiscountUsed,
      claveHash: client.passwordHash,
    };
    const row = client.isNew
      ? await this.db.cliente.create({ data: { ...data, telefono: client.phone, creadoEn: client.createdAt } })
      : await this.db.cliente.update({ where: { id: client.id }, data });
    return toClient(row);
  }
}
