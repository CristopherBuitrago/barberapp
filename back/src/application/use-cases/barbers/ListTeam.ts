import type { Barber } from "../../../domain/entities/Barber.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";

/** Todo el equipo con sus horarios, para el panel. */
export class ListTeam {
  constructor(private readonly barbers: BarberRepository) {}

  execute(): Promise<Barber[]> {
    return this.barbers.findAll();
  }
}
