import { isImageType, type Image } from "../../../domain/entities/Image.js";
import { RuleViolationError } from "../../../domain/errors/DomainError.js";
import type { ImageRepository } from "../../../domain/repositories/ImageRepository.js";

export class UploadImage {
  constructor(private readonly images: ImageRepository) {}

  async execute(input: { type: string; data: Uint8Array | null }): Promise<Image> {
    if (!isImageType(input.type) || !input.data || input.data.length === 0) {
      throw new RuleViolationError("Sube una imagen JPG, PNG o WebP");
    }
    return this.images.create(input.type, input.data);
  }
}
