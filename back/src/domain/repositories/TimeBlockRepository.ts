import type { TimeBlock } from "../entities/TimeBlock.js";

/** Los bloqueos vienen con su barbero. */
export interface TimeBlockRepository {
  findById(id: number): Promise<TimeBlock | null>;
  /** Los que se cruzan con [from, to), de todos o solo de esos barberos */
  findOverlapping(from: Date, to: Date, barberIds?: number[]): Promise<TimeBlock[]>;
  save(block: TimeBlock): Promise<TimeBlock>;
  delete(block: TimeBlock): Promise<void>;
}
