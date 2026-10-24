import type { Service } from "../../../domain/entities/Service.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";

/** Los servicios que ven los clientes en la web y en WhatsApp. */
export class ListCatalog {
  constructor(private readonly services: ServiceRepository) {}

  execute(): Promise<Service[]> {
    return this.services.findActive();
  }
}
