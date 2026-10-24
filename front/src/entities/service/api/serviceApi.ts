import { toBarber, type BarberDto } from "@/entities/barber/@x/service";
import { http } from "@/shared/api";
import { useRequest } from "@/shared/lib";
import type { AdminService, Service, ServiceFields } from "../model/types";

/** Como lo manda la API */
export interface ServiceDto {
  id: number;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precio: number;
  imagenUrl: string | null;
  activo: boolean;
}

export interface AdminServiceDto extends ServiceDto {
  creadoPor: BarberDto | null;
  actualizadoPor: BarberDto | null;
  creadoEn: string;
  actualizadoEn: string;
}

export function toService(dto: ServiceDto): Service {
  return {
    id: dto.id,
    name: dto.nombre,
    description: dto.descripcion,
    durationMin: dto.duracionMin,
    price: dto.precio,
    imageUrl: dto.imagenUrl,
    active: dto.activo,
  };
}

export function toAdminService(dto: AdminServiceDto): AdminService {
  return {
    ...toService(dto),
    createdBy: dto.creadoPor && toBarber(dto.creadoPor),
    updatedBy: dto.actualizadoPor && toBarber(dto.actualizadoPor),
    createdAt: dto.creadoEn,
    updatedAt: dto.actualizadoEn,
  };
}

/** Al revés: lo que se edita en el panel, como lo espera la API */
export function toServiceBody(fields: Partial<ServiceFields>) {
  return {
    nombre: fields.name,
    descripcion: fields.description,
    duracionMin: fields.durationMin,
    precio: fields.price,
    imagenUrl: fields.imageUrl,
    activo: fields.active,
  };
}

/** Los servicios que se ven en la web */
export async function getCatalog(): Promise<Service[]> {
  return (await http.getAll<ServiceDto>("/servicios")).map(toService);
}

/** Todos, también los ocultos, para el admin */
export async function getAdminServices(): Promise<AdminService[]> {
  return (await http.getAll<AdminServiceDto>("/panel/servicios")).map(toAdminService);
}

export function useCatalog() {
  return useRequest(getCatalog, []);
}

export function useAdminServices() {
  return useRequest(getAdminServices, []);
}
