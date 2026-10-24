import type { Image } from "../entities/Image.js";

export interface ImageRepository {
  create(type: string, data: Uint8Array): Promise<Image>;
  findById(id: number): Promise<Image | null>;
}
