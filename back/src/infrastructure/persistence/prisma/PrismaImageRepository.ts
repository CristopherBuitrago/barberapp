import type { Image } from "../../../domain/entities/Image.js";
import type { ImageRepository } from "../../../domain/repositories/ImageRepository.js";
import type { Db } from "./client.js";
import { toImage } from "./mappers.js";

export class PrismaImageRepository implements ImageRepository {
  constructor(private readonly db: Db) {}

  async findById(id: number): Promise<Image | null> {
    const row = await this.db.imagen.findUnique({ where: { id } });
    return row && toImage(row);
  }

  /** Las imágenes no se editan, solo se suben */
  async save(image: Image): Promise<Image> {
    if (!image.isNew) return image;
    const row = await this.db.imagen.create({
      data: { tipo: image.type, datos: new Uint8Array(image.data), creadaEn: image.createdAt },
    });
    return toImage(row);
  }
}
