import { ensure } from "../errors/DomainError.js";
import { Entity } from "./Entity.js";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface ImageData {
  type: string;
  data: Uint8Array;
  createdAt: Date;
}

/** Imagen subida desde el panel. Va dentro de la base para que un solo respaldo lo tenga todo. */
export class Image extends Entity {
  private constructor(
    private readonly _data: ImageData,
    id?: number,
  ) {
    super(id);
  }

  static upload(type: string, data: Uint8Array | null, now = new Date()): Image {
    ensure(
      (IMAGE_TYPES as readonly string[]).includes(type) && !!data && data.length > 0,
      "Sube una imagen JPG, PNG o WebP",
    );
    return new Image({ type, data: data!, createdAt: now });
  }

  /** Para armarla desde la base */
  static restore(id: number, data: ImageData): Image {
    return new Image(data, id);
  }

  get type(): string {
    return this._data.type;
  }

  get data(): Uint8Array {
    return this._data.data;
  }

  get createdAt(): Date {
    return this._data.createdAt;
  }

  /** La dirección con la que la muestra la web */
  get url(): string {
    return `/api/imagenes/${this.id}`;
  }
}
