import type { Barber } from "../entities/Barber.js";
import type { Client } from "../entities/Client.js";
import type { Session, SessionOwner } from "../entities/Session.js";

export interface SessionWithOwner extends Session {
  client: Client | null;
  barber: Barber | null;
}

export interface SessionRepository {
  create(owner: SessionOwner, tokenHash: string, expiresAt: Date): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<SessionWithOwner | null>;
  /** Si ya no existe no pasa nada */
  delete(id: number): Promise<void>;
}
