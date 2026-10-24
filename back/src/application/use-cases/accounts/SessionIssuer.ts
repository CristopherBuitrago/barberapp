import type { Barber } from "../../../domain/entities/Barber.js";
import type { Client } from "../../../domain/entities/Client.js";
import { Session } from "../../../domain/entities/Session.js";
import type { IssuedToken } from "../../dtos/accounts.js";
import type { Clock } from "../../ports/Clock.js";
import type { SessionTokens } from "../../ports/SessionTokens.js";

/**
 * Firma el token de una sesión. Dura sessionMinutes desde ahora, y como se vuelve a firmar
 * en cada petición, la sesión solo se cae cuando la persona deja de usar la web ese tiempo.
 */
export class SessionIssuer {
  constructor(
    private readonly tokens: SessionTokens,
    private readonly clock: Clock,
    private readonly sessionMinutes: number,
  ) {}

  async issue(owner: Client | Barber): Promise<IssuedToken> {
    const expiresAt = new Date(this.clock.now().getTime() + this.sessionMinutes * 60 * 1000);
    return { token: await this.tokens.sign(Session.claimsOf(owner), expiresAt), expiresAt };
  }
}
