import type { SessionOwner } from "../../../domain/entities/Session.js";
import type { SessionRepository } from "../../../domain/repositories/SessionRepository.js";
import type { Clock } from "../../ports/Clock.js";
import type { TokenService } from "../../ports/TokenService.js";

const SESSION_DAYS = 30;

/** Abre una sesión nueva. Devuelve el token para el navegador y en la base solo queda su hash. */
export class SessionIssuer {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService,
    private readonly clock: Clock,
  ) {}

  async issue(owner: SessionOwner): Promise<string> {
    const { token, tokenHash } = this.tokens.generate();
    const expiresAt = new Date(this.clock.now().getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await this.sessions.create(owner, tokenHash, expiresAt);
    return token;
  }
}
