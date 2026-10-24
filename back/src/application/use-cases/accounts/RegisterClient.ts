import { Client } from "../../../domain/entities/Client.js";
import { ConflictError, RuleViolationError } from "../../../domain/errors/DomainError.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../../domain/repositories/ClientRepository.js";
import { normalizePhone } from "../../../domain/value-objects/PhoneNumber.js";
import type { RegisterClientInput, RegisterResult } from "../../dtos/accounts.js";
import type { Clock } from "../../ports/Clock.js";
import type { PasswordHasher } from "../../ports/PasswordHasher.js";
import { MIN_PASSWORD_LENGTH } from "../barbers/SaveTeamAccount.js";
import { profileOf, toBirthDate } from "./profile.js";
import type { SessionIssuer } from "./SessionIssuer.js";

/** Crea la cuenta de un cliente y le deja listo el descuento de bienvenida. */
export class RegisterClient {
  constructor(
    private readonly barbers: BarberRepository,
    private readonly clients: ClientRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessionIssuer: SessionIssuer,
    private readonly clock: Clock,
    private readonly welcomeDiscountPct: number,
  ) {}

  async execute(input: RegisterClientInput): Promise<RegisterResult> {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new RuleViolationError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }
    const phone = normalizePhone(input.phone);
    const taken = "Ese teléfono ya tiene una cuenta. Inicia sesión.";
    if (await this.barbers.existsWithPhone(phone)) throw new ConflictError(taken);
    const existing = await this.clients.findByPhone(phone);
    if (existing?.hasAccount) throw new ConflictError(taken);

    // Si ya había reservado sin cuenta, por la web o WhatsApp, todo queda en la misma ficha
    const client = existing ?? Client.create({ name: input.name, phone }, this.clock.now());
    client.register({
      name: input.name,
      passwordHash: await this.hasher.hash(input.password),
      birthDate: input.birthDate ? toBirthDate(input.birthDate) : null,
    });
    const saved = await this.clients.save(client);

    return {
      token: await this.sessionIssuer.issue(saved),
      profile: profileOf(saved),
      welcomeDiscountPct: saved.hasPendingWelcomeDiscount ? this.welcomeDiscountPct : 0,
    };
  }
}
