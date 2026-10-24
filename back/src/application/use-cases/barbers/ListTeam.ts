import type { Barber } from "../../../domain/entities/Barber.js";
import type { Page, PageRequest } from "../../../domain/repositories/Pagination.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";

/** Todo el equipo con sus horarios, para el panel. */
export class ListTeam {
  constructor(private readonly barbers: BarberRepository) {}

  execute(page: PageRequest): Promise<Page<Barber>> {
    return this.barbers.listAll(page);
  }
}
