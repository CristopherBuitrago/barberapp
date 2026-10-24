import type { Session } from "../../../domain/entities/Session.js";
import type { SessionRepository } from "../../../domain/repositories/SessionRepository.js";

export class Logout {
  constructor(private readonly sessions: SessionRepository) {}

  execute(session: Session): Promise<void> {
    return this.sessions.delete(session);
  }
}
