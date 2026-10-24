import { Image } from "../../../domain/entities/Image.js";
import type { ImageRepository } from "../../../domain/repositories/ImageRepository.js";
import type { Clock } from "../../ports/Clock.js";

export class UploadImage {
  constructor(
    private readonly images: ImageRepository,
    private readonly clock: Clock,
  ) {}

  execute(input: { type: string; data: Uint8Array | null }): Promise<Image> {
    return this.images.save(Image.upload(input.type, input.data, this.clock.now()));
  }
}
