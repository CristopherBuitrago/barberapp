import type { BarberSummary } from "../../../domain/entities/Barber.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";

/** Los barberos que el cliente puede elegir al reservar. */
export class ListActiveBarbers {
  constructor(private readonly barbers: BarberRepository) {}

  async execute(): Promise<BarberSummary[]> {
    const barbers = await this.barbers.findActive();
    return barbers.map((b) => ({ id: b.id, name: b.name }));
  }
}
