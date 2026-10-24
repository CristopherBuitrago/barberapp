import type { ServiceData, ServiceWithAuthors } from "../../../domain/entities/Service.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";

export class CreateService {
  constructor(private readonly services: ServiceRepository) {}

  /** authorId es el admin que lo crea, queda guardado como creador */
  execute(input: { data: ServiceData; authorId: number }): Promise<ServiceWithAuthors> {
    return this.services.create(input.data, input.authorId);
  }
}
