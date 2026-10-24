import type { TimeBlock } from "../../../domain/entities/TimeBlock.js";
import { RuleViolationError } from "../../../domain/errors/DomainError.js";
import type { TimeBlockRepository } from "../../../domain/repositories/TimeBlockRepository.js";

/** Bloquea un rato de un barbero, desde el panel o por WhatsApp en modo barbero. */
export class CreateTimeBlock {
  constructor(private readonly timeBlocks: TimeBlockRepository) {}

  execute(input: { barberId: number; start: Date; end: Date; reason?: string }): Promise<TimeBlock> {
    if (input.end <= input.start) throw new RuleViolationError("El fin debe ser después del inicio");
    return this.timeBlocks.create({ ...input, reason: input.reason ?? "" });
  }
}
