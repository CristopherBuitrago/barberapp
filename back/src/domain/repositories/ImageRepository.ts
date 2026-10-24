import type { Image } from "../entities/Image.js";

export interface ImageRepository {
  findById(id: number): Promise<Image | null>;
  save(image: Image): Promise<Image>;
}
