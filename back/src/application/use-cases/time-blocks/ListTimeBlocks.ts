import type { TimeBlock } from "../../../domain/entities/TimeBlock.js";
import type { Page, PageRequest } from "../../../domain/repositories/Pagination.js";
import type { TimeBlockRepository } from "../../../domain/repositories/TimeBlockRepository.js";
import { addDays, type TimeZone } from "../../../domain/value-objects/TimeZone.js";

/** Bloqueos que tocan las fechas locales pedidas, las dos incluidas. */
export class ListTimeBlocks {
  constructor(
    private readonly timeBlocks: TimeBlockRepository,
    private readonly timeZone: TimeZone,
  ) {}

  execute(input: { fromDate: string; toDate: string; page: PageRequest }): Promise<Page<TimeBlock>> {
    return this.timeBlocks.listOverlapping(
      this.timeZone.toInstant(input.fromDate, "00:00"),
      this.timeZone.toInstant(addDays(input.toDate, 1), "00:00"),
      input.page,
    );
  }
}
