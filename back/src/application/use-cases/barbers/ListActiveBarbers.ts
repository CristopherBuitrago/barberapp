import type { Barber } from "../../../domain/entities/Barber.js";
import { paginate, type Page, type PageRequest } from "../../../domain/repositories/Pagination.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";

/** Los barberos que el cliente puede elegir al reservar. */
export class ListActiveBarbers {
  constructor(private readonly barbers: BarberRepository) {}

  async execute(page: PageRequest): Promise<Page<Barber>> {
    return paginate(await this.barbers.findActive(), page);
  }
}
