import type { Barber } from "../../../domain/entities/Barber.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";

/** Los barberos que el cliente puede elegir al reservar. */
export class ListActiveBarbers {
  constructor(private readonly barbers: BarberRepository) {}

  execute(): Promise<Barber[]> {
    return this.barbers.findActive();
  }
}
