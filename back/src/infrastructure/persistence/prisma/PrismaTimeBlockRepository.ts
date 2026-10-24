import type { TimeBlock, TimeBlockWithBarber } from "../../../domain/entities/TimeBlock.js";
import type { TimeBlockRepository } from "../../../domain/repositories/TimeBlockRepository.js";
import type { Db } from "./client.js";
import { barberSummarySelect, toTimeBlock, toTimeBlockWithBarber } from "./mappers.js";

export class PrismaTimeBlockRepository implements TimeBlockRepository {
  constructor(private readonly db: Db) {}

  async create(data: { barberId: number; start: Date; end: Date; reason: string }): Promise<TimeBlock> {
    const row = await this.db.bloqueoHorario.create({
      data: { barberoId: data.barberId, inicio: data.start, fin: data.end, motivo: data.reason },
    });
    return toTimeBlock(row);
  }

  async findOverlapping(from: Date, to: Date, barberIds: number[]): Promise<TimeBlock[]> {
    const rows = await this.db.bloqueoHorario.findMany({
      where: { barberoId: { in: barberIds }, inicio: { lt: to }, fin: { gt: from } },
    });
    return rows.map(toTimeBlock);
  }

  async findOverlappingWithBarber(from: Date, to: Date): Promise<TimeBlockWithBarber[]> {
    const rows = await this.db.bloqueoHorario.findMany({
      where: { inicio: { lt: to }, fin: { gt: from } },
      include: { barbero: barberSummarySelect },
      orderBy: { inicio: "asc" },
    });
    return rows.map(toTimeBlockWithBarber);
  }

  async delete(id: number): Promise<boolean> {
    const { count } = await this.db.bloqueoHorario.deleteMany({ where: { id } });
    return count > 0;
  }
}
