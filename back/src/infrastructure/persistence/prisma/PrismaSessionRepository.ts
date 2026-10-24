import type { SessionOwner } from "../../../domain/entities/Session.js";
import type { SessionRepository, SessionWithOwner } from "../../../domain/repositories/SessionRepository.js";
import type { Db } from "./client.js";
import { toBarber, toClient, toSession } from "./mappers.js";

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly db: Db) {}

  async create(owner: SessionOwner, tokenHash: string, expiresAt: Date): Promise<void> {
    const ownerColumns = "clientId" in owner ? { clienteId: owner.clientId } : { barberoId: owner.barberId };
    await this.db.sesion.create({ data: { ...ownerColumns, tokenHash, expira: expiresAt } });
  }

  async findByTokenHash(tokenHash: string): Promise<SessionWithOwner | null> {
    const row = await this.db.sesion.findUnique({ where: { tokenHash }, include: { cliente: true, barbero: true } });
    if (!row) return null;
    return {
      ...toSession(row),
      client: row.cliente && toClient(row.cliente),
      barber: row.barbero && toBarber(row.barbero),
    };
  }

  async delete(id: number): Promise<void> {
    await this.db.sesion.deleteMany({ where: { id } });
  }
}
