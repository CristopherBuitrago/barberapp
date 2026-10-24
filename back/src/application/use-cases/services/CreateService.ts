import type { Barber } from "../../../domain/entities/Barber.js";
import { Service, type EditableServiceFields } from "../../../domain/entities/Service.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";
import type { Clock } from "../../ports/Clock.js";

export class CreateService {
  constructor(
    private readonly services: ServiceRepository,
    private readonly clock: Clock,
  ) {}

  /** author es el admin que lo crea, queda guardado como creador */
  execute(input: { fields: EditableServiceFields; author: Barber }): Promise<Service> {
    return this.services.save(Service.create(input.fields, input.author, this.clock.now()));
  }
}
