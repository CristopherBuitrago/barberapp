import type { Image } from "../../../domain/entities/Image.js";
import { NotFoundError } from "../../../domain/errors/DomainError.js";
import type { ImageRepository } from "../../../domain/repositories/ImageRepository.js";

export class GetImage {
  constructor(private readonly images: ImageRepository) {}

  async execute(imageId: number): Promise<Image> {
    const image = await this.images.findById(imageId);
    if (!image) throw new NotFoundError("Imagen no encontrada");
    return image;
  }
}
