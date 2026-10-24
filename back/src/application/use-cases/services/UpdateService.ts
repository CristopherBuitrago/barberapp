import type { ServiceData, ServiceWithAuthors } from "../../../domain/entities/Service.js";
import { NotFoundError } from "../../../domain/errors/DomainError.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";

/** Edita un servicio o lo oculta. Queda guardado quién hizo el último cambio. */
export class UpdateService {
  constructor(private readonly services: ServiceRepository) {}

  async execute(input: { serviceId: number; data: Partial<ServiceData>; authorId: number }): Promise<ServiceWithAuthors> {
    if (!(await this.services.exists(input.serviceId))) throw new NotFoundError("Servicio no encontrado");
    return this.services.update(input.serviceId, input.data, input.authorId);
  }
}
