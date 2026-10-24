import { ErrorCode } from "../../../domain/errors/ErrorCode.js";
import { UnauthorizedError } from "../../../domain/errors/DomainError.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../../domain/repositories/ClientRepository.js";
import { normalizePhone } from "../../../domain/value-objects/PhoneNumber.js";
import type { LoginInput, LoginResult } from "../../dtos/accounts.js";
import type { PasswordHasher } from "../../ports/PasswordHasher.js";
import { profileOf } from "./profile.js";
import type { SessionIssuer } from "./SessionIssuer.js";

/** Todos entran con teléfono y contraseña. Si el teléfono es de alguien del equipo va al panel. */
export class Login {
  constructor(
    private readonly barbers: BarberRepository,
    private readonly clients: ClientRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const phone = normalizePhone(input.phone);

    const barber = await this.barbers.findActiveByPhone(phone);
    const teamMember = barber?.hasAccount ? barber : null;
    if (teamMember && (await this.hasher.verify(input.password, teamMember.passwordHash!))) {
      return { session: await this.sessionIssuer.issue(teamMember), profile: profileOf(teamMember) };
    }

    // Si el teléfono es del equipo no se prueba como cliente, aunque la contraseña no haya servido
    const client = teamMember ? null : await this.clients.findByPhone(phone);
    if (client?.hasAccount && (await this.hasher.verify(input.password, client.passwordHash!))) {
      return { session: await this.sessionIssuer.issue(client), profile: profileOf(client) };
    }

    throw new UnauthorizedError("Teléfono o contraseña incorrectos", ErrorCode.InvalidCredentials);
  }
}
