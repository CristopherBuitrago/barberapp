import type { TimeBlock, TimeBlockWithBarber } from "../entities/TimeBlock.js";

export interface TimeBlockRepository {
  create(data: { barberId: number; start: Date; end: Date; reason: string }): Promise<TimeBlock>;
  /** Los que se cruzan con [from, to) */
  findOverlapping(from: Date, to: Date, barberIds: number[]): Promise<TimeBlock[]>;
  findOverlappingWithBarber(from: Date, to: Date): Promise<TimeBlockWithBarber[]>;
  /** Devuelve false si no existía */
  delete(id: number): Promise<boolean>;
}
