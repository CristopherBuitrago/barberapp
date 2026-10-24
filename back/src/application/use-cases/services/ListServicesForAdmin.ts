import type { Service } from "../../../domain/entities/Service.js";
import type { Page, PageRequest } from "../../../domain/repositories/Pagination.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";

/** Todos los servicios, también los ocultos, con quién los creó y quién los cambió. */
export class ListServicesForAdmin {
  constructor(private readonly services: ServiceRepository) {}

  execute(page: PageRequest): Promise<Page<Service>> {
    return this.services.findAll(page);
  }
}
