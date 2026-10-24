import type { Service } from "../../../domain/entities/Service.js";
import type { Page, PageRequest } from "../../../domain/repositories/Pagination.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";

/** Los servicios que ven los clientes en la web y en WhatsApp. */
export class ListCatalog {
  constructor(private readonly services: ServiceRepository) {}

  execute(page: PageRequest): Promise<Page<Service>> {
    return this.services.findActive(page);
  }
}
