export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

/** Imagen subida desde el panel. Va dentro de la base para que un solo respaldo lo tenga todo. */
export interface Image {
  id: number;
  type: string;
  data: Uint8Array;
  createdAt: Date;
}

export function isImageType(type: string): type is ImageType {
  return (IMAGE_TYPES as readonly string[]).includes(type);
}
