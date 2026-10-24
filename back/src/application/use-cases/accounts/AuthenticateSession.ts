import { roleOf, type AuthSession } from "../../../domain/entities/Session.js";
import type { SessionRepository } from "../../../domain/repositories/SessionRepository.js";
import type { Clock } from "../../ports/Clock.js";
import type { TokenService } from "../../ports/TokenService.js";

/** Con el token del navegador dice quién es. Null si el token no sirve o ya venció. */
export class AuthenticateSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService,
    private readonly clock: Clock,
  ) {}

  async execute(token: string): Promise<AuthSession | null> {
    const session = await this.sessions.findByTokenHash(this.tokens.hash(token));
    if (!session || session.expiresAt <= this.clock.now()) return null;
    if (session.client) return { sessionId: session.id, role: "CLIENTE", client: session.client };
    // A un barbero que desactivaron se le cae la sesión de una vez
    if (session.barber?.active) return { sessionId: session.id, role: roleOf(session.barber), barber: session.barber };
    return null;
  }
}
