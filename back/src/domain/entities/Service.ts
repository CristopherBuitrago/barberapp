import type { BarberSummary } from "./Barber.js";

/** Servicio del catálogo. No se borra porque las citas pasadas lo usan, se oculta con active en false. */
export interface Service {
  id: number;
  name: string;
  description: string;
  durationMin: number;
  /** En pesos, sin decimales */
  price: number;
  /** "/api/imagenes/<id>" cuando la subieron desde el panel */
  imageUrl: string | null;
  active: boolean;
  /** Null en los datos de ejemplo */
  createdById: number | null;
  updatedById: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Como lo ve el admin, con quién lo creó y quién lo cambió de último. */
export interface ServiceWithAuthors extends Service {
  createdBy: BarberSummary | null;
  updatedBy: BarberSummary | null;
}

export type ServiceData = Pick<Service, "name" | "description" | "durationMin" | "price" | "imageUrl" | "active">;
