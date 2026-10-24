import type { Service } from "../entities/Service.js";

/** Los servicios vienen con el barbero que los creó y el que los cambió de último. */
export interface ServiceRepository {
  /** Los que se ven en la web y en WhatsApp, en orden de id */
  findActive(): Promise<Service[]>;
  findActiveById(id: number): Promise<Service | null>;
  /** Todos, también los ocultos, para el admin */
  findAll(): Promise<Service[]>;
  findById(id: number): Promise<Service | null>;
  save(service: Service): Promise<Service>;
}
