import type { Session } from "../entities/Session.js";

/** Las sesiones vienen con su dueño, el cliente o el barbero. */
export interface SessionRepository {
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  save(session: Session): Promise<Session>;
  /** Si ya no existe no pasa nada */
  delete(session: Session): Promise<void>;
}
