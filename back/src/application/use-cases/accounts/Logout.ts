import type { SessionRepository } from "../../../domain/repositories/SessionRepository.js";

export class Logout {
  constructor(private readonly sessions: SessionRepository) {}

  execute(sessionId: number): Promise<void> {
    return this.sessions.delete(sessionId);
  }
}
