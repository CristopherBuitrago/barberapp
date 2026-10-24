import { NotFoundError } from "../../../domain/errors/DomainError.js";
import type { TimeBlockRepository } from "../../../domain/repositories/TimeBlockRepository.js";

export class DeleteTimeBlock {
  constructor(private readonly timeBlocks: TimeBlockRepository) {}

  async execute(timeBlockId: number): Promise<void> {
    if (!(await this.timeBlocks.delete(timeBlockId))) throw new NotFoundError("Bloqueo no encontrado");
  }
}
