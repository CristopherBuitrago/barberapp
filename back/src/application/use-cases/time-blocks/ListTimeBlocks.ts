import type { TimeBlockWithBarber } from "../../../domain/entities/TimeBlock.js";
import type { TimeBlockRepository } from "../../../domain/repositories/TimeBlockRepository.js";
import { addDays, type TimeZone } from "../../../domain/value-objects/TimeZone.js";

/** Bloqueos que tocan las fechas locales pedidas, las dos incluidas. */
export class ListTimeBlocks {
  constructor(
    private readonly timeBlocks: TimeBlockRepository,
    private readonly timeZone: TimeZone,
  ) {}

  execute(input: { fromDate: string; toDate: string }): Promise<TimeBlockWithBarber[]> {
    return this.timeBlocks.findOverlappingWithBarber(
      this.timeZone.toInstant(input.fromDate, "00:00"),
      this.timeZone.toInstant(addDays(input.toDate, 1), "00:00"),
    );
  }
}
