import { ErrorCode } from "../../../domain/errors/ErrorCode.js";
import { TimeBlock } from "../../../domain/entities/TimeBlock.js";
import { NotFoundError } from "../../../domain/errors/DomainError.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { TimeBlockRepository } from "../../../domain/repositories/TimeBlockRepository.js";

/** Bloquea un rato de un barbero, desde el panel o por WhatsApp en modo barbero. */
export class CreateTimeBlock {
  constructor(
    private readonly timeBlocks: TimeBlockRepository,
    private readonly barbers: BarberRepository,
  ) {}

  async execute(input: { barberId: number; start: Date; end: Date; reason?: string }): Promise<TimeBlock> {
    const barber = await this.barbers.findById(input.barberId);
    if (!barber) throw new NotFoundError("Barbero no encontrado", ErrorCode.BarberNotFound);
    return this.timeBlocks.save(TimeBlock.create({ barber, start: input.start, end: input.end, reason: input.reason }));
  }
}
