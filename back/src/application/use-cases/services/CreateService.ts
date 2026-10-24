import { ErrorCode } from "../../../domain/errors/ErrorCode.js";
import type { Barber } from "../../../domain/entities/Barber.js";
import { Service, type EditableServiceFields } from "../../../domain/entities/Service.js";
import { ConflictError } from "../../../domain/errors/DomainError.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";
import type { Clock } from "../../ports/Clock.js";

export class CreateService {
  constructor(
    private readonly services: ServiceRepository,
    private readonly clock: Clock,
  ) {}

  /** author es el admin que lo crea, queda guardado como creador */
  async execute(input: { fields: EditableServiceFields; author: Barber }): Promise<Service> {
    const service = Service.create(input.fields, input.author, this.clock.now());
    await ensureFreeName(this.services, service.name);
    return this.services.save(service);
  }
}

/** Dos servicios no se pueden llamar igual, tampoco si uno está oculto */
export async function ensureFreeName(services: ServiceRepository, name: string, exceptId?: number): Promise<void> {
  if (await services.existsWithName(name, exceptId)) {
    throw new ConflictError(`Ya hay un servicio llamado "${name}". Si está oculto, vuelve a mostrarlo`, ErrorCode.ServiceNameTaken);
  }
}
