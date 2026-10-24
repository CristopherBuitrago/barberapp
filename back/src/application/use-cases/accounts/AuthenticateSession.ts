import type { Barber } from "../../../domain/entities/Barber.js";
import type { Client } from "../../../domain/entities/Client.js";
import { Session } from "../../../domain/entities/Session.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../../domain/repositories/ClientRepository.js";
import type { IssuedToken } from "../../dtos/accounts.js";
import type { SessionTokens } from "../../ports/SessionTokens.js";
import type { SessionIssuer } from "./SessionIssuer.js";

/**
 * Con el token del navegador dice de quién es la sesión y le firma uno nuevo con otros
 * 30 minutos, así la sesión sigue viva mientras la persona esté usando la web.
 * Null si el token no sirve, ya venció, o el dueño ya no existe o lo desactivaron.
 */
export class AuthenticateSession {
  constructor(
    private readonly tokens: SessionTokens,
    private readonly clients: ClientRepository,
    private readonly barbers: BarberRepository,
    private readonly issuer: SessionIssuer,
  ) {}

  async execute(token: string): Promise<{ session: Session; renewed: IssuedToken } | null> {
    const verified = await this.tokens.verify(token);
    if (!verified) return null;

    // El dueño se trae de la base en cada petición, así un cambio de rol o de nombre se ve de una
    const { ownerKind, ownerId } = verified.claims;
    const owner: Client | Barber | null =
      ownerKind === "client" ? await this.clients.findById(ownerId) : await this.barbers.findById(ownerId);
    if (!owner || !new Session(owner, verified.expiresAt).ownerCanUseIt) return null;

    const renewed = await this.issuer.issue(owner);
    return { session: new Session(owner, renewed.expiresAt), renewed };
  }
}
