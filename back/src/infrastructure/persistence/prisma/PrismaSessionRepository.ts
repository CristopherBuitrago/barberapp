import { Barber } from "../../../domain/entities/Barber.js";
import type { Session } from "../../../domain/entities/Session.js";
import type { SessionRepository } from "../../../domain/repositories/SessionRepository.js";
import type { Db } from "./client.js";
import { sessionInclude, toSession } from "./mappers.js";

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly db: Db) {}

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const row = await this.db.sesion.findUnique({ where: { tokenHash }, include: sessionInclude });
    return row && toSession(row);
  }

  async save(session: Session): Promise<Session> {
    if (!session.isNew) {
      await this.db.sesion.update({ where: { id: session.id }, data: { expira: session.expiresAt } });
      return session;
    }
    const owner =
      session.owner instanceof Barber ? { barberoId: session.owner.id } : { clienteId: session.owner.id };
    const row = await this.db.sesion.create({
      data: { ...owner, tokenHash: session.tokenHash, expira: session.expiresAt },
      include: sessionInclude,
    });
    return toSession(row)!;
  }

  async delete(session: Session): Promise<void> {
    await this.db.sesion.deleteMany({ where: { id: session.id } });
  }
}
