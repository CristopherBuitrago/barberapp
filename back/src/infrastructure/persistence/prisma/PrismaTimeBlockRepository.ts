import type { TimeBlock } from "../../../domain/entities/TimeBlock.js";
import { offsetOf, type Page, type PageRequest } from "../../../domain/repositories/Pagination.js";
import type { TimeBlockRepository } from "../../../domain/repositories/TimeBlockRepository.js";
import type { Db } from "./client.js";
import { timeBlockInclude, toTimeBlock } from "./mappers.js";

export class PrismaTimeBlockRepository implements TimeBlockRepository {
  constructor(private readonly db: Db) {}

  async findById(id: number): Promise<TimeBlock | null> {
    const row = await this.db.bloqueoHorario.findUnique({ where: { id }, include: timeBlockInclude });
    return row && toTimeBlock(row);
  }

  async findOverlapping(from: Date, to: Date, barberIds?: number[]): Promise<TimeBlock[]> {
    const rows = await this.db.bloqueoHorario.findMany({
      where: { inicio: { lt: to }, fin: { gt: from }, ...(barberIds ? { barberoId: { in: barberIds } } : {}) },
      include: timeBlockInclude,
      orderBy: { inicio: "asc" },
    });
    return rows.map(toTimeBlock);
  }

  async listOverlapping(from: Date, to: Date, page: PageRequest): Promise<Page<TimeBlock>> {
    const where = { inicio: { lt: to }, fin: { gt: from } };
    const [rows, total] = await Promise.all([
      this.db.bloqueoHorario.findMany({
        where,
        include: timeBlockInclude,
        orderBy: [{ inicio: "asc" }, { id: "asc" }],
        skip: offsetOf(page),
        take: page.perPage,
      }),
      this.db.bloqueoHorario.count({ where }),
    ]);
    return { items: rows.map(toTimeBlock), total };
  }

  async save(block: TimeBlock): Promise<TimeBlock> {
    const data = { inicio: block.start, fin: block.end, motivo: block.reason };
    const row = block.isNew
      ? await this.db.bloqueoHorario.create({ data: { ...data, barberoId: block.barber.id }, include: timeBlockInclude })
      : await this.db.bloqueoHorario.update({ where: { id: block.id }, data, include: timeBlockInclude });
    return toTimeBlock(row);
  }

  async delete(block: TimeBlock): Promise<void> {
    await this.db.bloqueoHorario.deleteMany({ where: { id: block.id } });
  }
}
