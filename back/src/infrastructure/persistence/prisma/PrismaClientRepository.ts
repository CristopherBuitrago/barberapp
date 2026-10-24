import type { Prisma } from "@prisma/client";
import type { Client } from "../../../domain/entities/Client.js";
import type { ClientRepository, ClientWithHistory } from "../../../domain/repositories/ClientRepository.js";
import { offsetOf, type Page, type PageRequest } from "../../../domain/repositories/Pagination.js";
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

  async search(search: string | undefined, page: PageRequest): Promise<Page<ClientWithHistory>> {
    const text = search?.trim() ?? "";
    const digits = text.replace(/\D/g, "");
    const where: Prisma.ClienteWhereInput = text
      ? {
          OR: [
            { nombre: { contains: text, mode: "insensitive" } },
            // Por teléfono solo si escribieron números, así "Ana" no trae a todos
            ...(digits ? [{ telefono: { contains: digits } }] : []),
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      this.db.cliente.findMany({
        where,
        include: {
          _count: { select: { citas: true } },
          citas: { orderBy: { inicio: "desc" }, take: 1, select: { inicio: true, estado: true } },
        },
        orderBy: [{ nombre: "asc" }, { id: "asc" }],
        skip: offsetOf(page),
        take: page.perPage,
      }),
      this.db.cliente.count({ where }),
    ]);
    const items = rows.map((row) => ({
      client: toClient(row),
      appointmentCount: row._count.citas,
      lastAppointment: row.citas[0] ? { start: row.citas[0].inicio, status: row.citas[0].estado } : null,
    }));
    return { items, total };
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
