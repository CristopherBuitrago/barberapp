import type { Service } from "../entities/Service.js";
import type { Page, PageRequest } from "./Pagination.js";

/** Los servicios vienen con el barbero que los creó y el que los cambió de último. */
export interface ServiceRepository {
  /** Los que se ven en la web y en WhatsApp, en orden de id */
  findActive(page: PageRequest): Promise<Page<Service>>;
  findActiveById(id: number): Promise<Service | null>;
  /** Todos, también los ocultos, para el admin */
  findAll(page: PageRequest): Promise<Page<Service>>;
  findById(id: number): Promise<Service | null>;
  save(service: Service): Promise<Service>;
}
