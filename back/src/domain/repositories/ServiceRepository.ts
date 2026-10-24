import type { Service, ServiceData, ServiceWithAuthors } from "../entities/Service.js";

export interface ServiceRepository {
  /** Los que se ven en la web y en WhatsApp, en orden de id */
  findActive(): Promise<Service[]>;
  findActiveById(id: number): Promise<Service | null>;
  /** Todos, también los ocultos, para el admin */
  findAllWithAuthors(): Promise<ServiceWithAuthors[]>;
  exists(id: number): Promise<boolean>;
  create(data: ServiceData, authorId: number): Promise<ServiceWithAuthors>;
  update(id: number, data: Partial<ServiceData>, authorId: number): Promise<ServiceWithAuthors>;
}
