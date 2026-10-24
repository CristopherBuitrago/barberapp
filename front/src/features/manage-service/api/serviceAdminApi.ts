import { toAdminService, toServiceBody, type AdminService, type AdminServiceDto, type ServiceFields } from "@/entities/service";
import { ApiError, http } from "@/shared/api";

export async function createService(fields: ServiceFields): Promise<AdminService> {
  return toAdminService(await http.post<AdminServiceDto>("/panel/servicios", toServiceBody(fields)));
}

/** Solo cambia los campos que manden, también sirve para ocultar o mostrar */
export async function updateService(id: number, fields: Partial<ServiceFields>): Promise<AdminService> {
  return toAdminService(await http.patch<AdminServiceDto>(`/panel/servicios/${id}`, toServiceBody(fields)));
}

/** Sube la imagen tal cual y devuelve la url que va en imageUrl */
export async function uploadImage(file: File): Promise<string> {
  try {
    return (await http.upload<{ url: string }>("/panel/imagenes", file)).url;
  } catch (e) {
    if (e instanceof ApiError && e.code === "PAYLOAD_TOO_LARGE") throw new Error("La imagen pesa más de 3 MB");
    throw e;
  }
}
