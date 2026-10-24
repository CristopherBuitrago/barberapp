import { UnauthorizedError } from "../../../domain/errors/DomainError.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../../domain/repositories/ClientRepository.js";
import { normalizePhone } from "../../../domain/value-objects/PhoneNumber.js";
import type { LoginInput, LoginResult } from "../../dtos/accounts.js";
import type { PasswordHasher } from "../../ports/PasswordHasher.js";
import { clientProfile, teamProfile } from "./profile.js";
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
    const teamMember = barber?.passwordHash ? barber : null;
    if (teamMember && (await this.hasher.verify(input.password, teamMember.passwordHash!))) {
      const token = await this.sessionIssuer.issue({ barberId: teamMember.id });
      return { token, profile: teamProfile(teamMember) };
    }

    // Si el teléfono es del equipo no se prueba como cliente, aunque la contraseña no haya servido
    const client = teamMember ? null : await this.clients.findByPhone(phone);
    if (client?.passwordHash && (await this.hasher.verify(input.password, client.passwordHash))) {
      const token = await this.sessionIssuer.issue({ clientId: client.id });
      return { token, profile: clientProfile(client) };
    }

    throw new UnauthorizedError("Teléfono o contraseña incorrectos");
  }
}
