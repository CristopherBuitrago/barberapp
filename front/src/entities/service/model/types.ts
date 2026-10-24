import type { Barber } from "@/entities/barber/@x/service";

export interface Service {
  id: number;
  name: string;
  description: string;
  durationMin: number;
  /** En pesos, sin decimales */
  price: number;
  /** "/api/imagenes/3" si la subieron desde el panel */
  imageUrl: string | null;
  active: boolean;
}

/** Como lo ve el admin, con quién lo creó y quién lo cambió de último */
export interface AdminService extends Service {
  createdBy: Barber | null;
  updatedBy: Barber | null;
  createdAt: string;
  updatedAt: string;
}

/** Lo que se edita de un servicio desde el panel */
export type ServiceFields = Pick<Service, "name" | "description" | "durationMin" | "price" | "imageUrl" | "active">;
