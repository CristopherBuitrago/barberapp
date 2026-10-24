import type { Barber } from "../../../domain/entities/Barber.js";
import { NotFoundError, RuleViolationError } from "../../../domain/errors/DomainError.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../../domain/repositories/ClientRepository.js";
import { normalizePhone } from "../../../domain/value-objects/PhoneNumber.js";
import type { PasswordHasher } from "../../ports/PasswordHasher.js";

export const MIN_PASSWORD_LENGTH = 6;

/**
 * Le pone la cuenta del panel a un barbero que ya existe, buscándolo por el nombre.
 * Ese teléfono también es con el que el agente lo reconoce en modo barbero.
 */
export class SaveTeamAccount {
  constructor(
    private readonly barbers: BarberRepository,
    private readonly clients: ClientRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: {
    name: string;
    phone: string;
    password: string;
    isAdmin: boolean;
  }): Promise<{ barber: Barber; alsoClientAccount: boolean }> {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new RuleViolationError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }
    const barber = await this.barbers.findByName(input.name);
    if (!barber) {
      const names = (await this.barbers.findAll()).map((b) => b.name);
      throw new NotFoundError(`No hay un barbero llamado "${input.name}". Barberos: ${names.join(", ") || "(ninguno)"}`);
    }
    // Si ese teléfono también tiene cuenta de cliente, con él se va a entrar al panel
    const client = await this.clients.findByPhone(normalizePhone(input.phone));
    barber.setAccount(input.phone, await this.hasher.hash(input.password), input.isAdmin);
    return { barber: await this.barbers.save(barber), alsoClientAccount: !!client?.hasAccount };
  }
}
