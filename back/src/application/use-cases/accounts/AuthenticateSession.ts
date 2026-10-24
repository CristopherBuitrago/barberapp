import type { Session } from "../../../domain/entities/Session.js";
import type { SessionRepository } from "../../../domain/repositories/SessionRepository.js";
import type { Clock } from "../../ports/Clock.js";
import type { TokenService } from "../../ports/TokenService.js";

/** Con el token del navegador dice de quién es la sesión. Null si no sirve o ya venció. */
export class AuthenticateSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService,
    private readonly clock: Clock,
  ) {}

  async execute(token: string): Promise<Session | null> {
    const session = await this.sessions.findByTokenHash(this.tokens.hash(token));
    // A un barbero que desactivaron se le cae la sesión de una vez
    return session?.isValidAt(this.clock.now()) ? session : null;
  }
}
