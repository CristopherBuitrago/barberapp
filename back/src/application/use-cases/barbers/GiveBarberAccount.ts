import { ErrorCode } from "../../../domain/errors/ErrorCode.js";
import type { Barber } from "../../../domain/entities/Barber.js";
import { NotFoundError, RuleViolationError } from "../../../domain/errors/DomainError.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { PasswordHasher } from "../../ports/PasswordHasher.js";
import { MIN_PASSWORD_LENGTH } from "./SaveTeamAccount.js";

/**
 * El admin le da cuenta del panel a un barbero, o le cambia la contraseña si ya tenía.
 * Entra con su teléfono. Desde aquí no se hace admin a nadie, eso queda en el script.
 */
export class GiveBarberAccount {
  constructor(
    private readonly barbers: BarberRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: { barberId: number; password: string }): Promise<Barber> {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new RuleViolationError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`, ErrorCode.PasswordTooShort);
    }
    const barber = await this.barbers.findById(input.barberId);
    if (!barber) throw new NotFoundError("Barbero no encontrado", ErrorCode.BarberNotFound);
    if (!barber.phone) throw new RuleViolationError("Ponle primero un teléfono, es con lo que va a entrar");
    barber.setAccount(barber.phone, await this.hasher.hash(input.password), barber.isAdmin);
    return this.barbers.save(barber);
  }
}
