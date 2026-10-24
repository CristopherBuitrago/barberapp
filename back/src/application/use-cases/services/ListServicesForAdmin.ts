import type { Service } from "../../../domain/entities/Service.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";

/** Todos los servicios, también los ocultos, con quién los creó y quién los cambió. */
export class ListServicesForAdmin {
  constructor(private readonly services: ServiceRepository) {}

  execute(): Promise<Service[]> {
    return this.services.findAll();
  }
}
