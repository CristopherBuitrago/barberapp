import type { ServiceWithAuthors } from "../../../domain/entities/Service.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";

/** Todos los servicios, también los ocultos, con quién los creó y quién los cambió. */
export class ListServicesForAdmin {
  constructor(private readonly services: ServiceRepository) {}

  execute(): Promise<ServiceWithAuthors[]> {
    return this.services.findAllWithAuthors();
  }
}
