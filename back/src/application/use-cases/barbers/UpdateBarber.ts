import { ErrorCode } from "../../../domain/errors/ErrorCode.js";
import type { Barber } from "../../../domain/entities/Barber.js";
import { ForbiddenError, NotFoundError } from "../../../domain/errors/DomainError.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../../domain/repositories/ClientRepository.js";
import type { UpdateBarberInput } from "../../dtos/barbers.js";
import { ensureFreeNameAndPhone } from "./teamRules.js";

/**
 * El admin cambia nombre, teléfono, semana o si está activo. Desactivado deja de salir
 * para reservar y pierde la sesión del panel, pero sus citas siguen ahí.
 */
export class UpdateBarber {
  constructor(
    private readonly barbers: BarberRepository,
    private readonly clients: ClientRepository,
  ) {}

  /** actor es el admin que hace el cambio */
  async execute(input: UpdateBarberInput, actor: Barber): Promise<Barber> {
    const barber = await this.barbers.findById(input.barberId);
    if (!barber) throw new NotFoundError("Barbero no encontrado", ErrorCode.BarberNotFound);
    // Si el admin se desactiva a sí mismo se queda por fuera del panel sin nadie que lo arregle
    if (input.active === false && barber.equals(actor)) {
      throw new ForbiddenError("No te puedes desactivar a ti mismo", ErrorCode.OwnAccessLocked);
    }

    if (input.name !== undefined) barber.name = input.name;
    if (input.phone !== undefined) barber.phone = input.phone;
    if (input.active !== undefined) barber.active = input.active;
    if (input.schedules) barber.replaceSchedules(input.schedules);

    await ensureFreeNameAndPhone(
      this.barbers,
      this.clients,
      input.name !== undefined ? barber.name : undefined,
      input.phone !== undefined ? barber.phone : undefined,
      barber.id,
    );
    return this.barbers.save(barber);
  }
}
