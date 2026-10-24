import { NotFoundError } from "../../../domain/errors/DomainError.js";
import type { TimeBlockRepository } from "../../../domain/repositories/TimeBlockRepository.js";

export class DeleteTimeBlock {
  constructor(private readonly timeBlocks: TimeBlockRepository) {}

  async execute(timeBlockId: number): Promise<void> {
    const block = await this.timeBlocks.findById(timeBlockId);
    if (!block) throw new NotFoundError("Bloqueo no encontrado");
    await this.timeBlocks.delete(block);
  }
}
