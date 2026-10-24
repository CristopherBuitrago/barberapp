import { ErrorCode } from "../../../domain/errors/ErrorCode.js";
import type { Barber } from "../../../domain/entities/Barber.js";
import type { EditableServiceFields, Service } from "../../../domain/entities/Service.js";
import { NotFoundError } from "../../../domain/errors/DomainError.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";
import type { Clock } from "../../ports/Clock.js";

/** Edita un servicio o lo oculta. Queda guardado quién hizo el último cambio. */
export class UpdateService {
  constructor(
    private readonly services: ServiceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: { serviceId: number; fields: Partial<EditableServiceFields>; author: Barber }): Promise<Service> {
    const service = await this.services.findById(input.serviceId);
    if (!service) throw new NotFoundError("Servicio no encontrado", ErrorCode.ServiceNotFound);
    service.update(input.fields, input.author, this.clock.now());
    return this.services.save(service);
  }
}
