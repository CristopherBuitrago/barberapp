import type { Image } from "../../../domain/entities/Image.js";
import type { ImageRepository } from "../../../domain/repositories/ImageRepository.js";
import type { Db } from "./client.js";
import { toImage } from "./mappers.js";

export class PrismaImageRepository implements ImageRepository {
  constructor(private readonly db: Db) {}

  async create(type: string, data: Uint8Array): Promise<Image> {
    return toImage(await this.db.imagen.create({ data: { tipo: type, datos: new Uint8Array(data) } }));
  }

  async findById(id: number): Promise<Image | null> {
    const row = await this.db.imagen.findUnique({ where: { id } });
    return row && toImage(row);
  }
}
