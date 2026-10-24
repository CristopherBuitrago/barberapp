import type { AppointmentStatus } from "@/entities/appointment/@x/client";
import { http } from "@/shared/api";
import { useRequest } from "@/shared/lib";
import type { ClientSummary } from "../model/types";

/** Como lo manda la API */
interface ClientSummaryDto {
  id: number;
  nombre: string;
  telefono: string;
  tieneCuenta: boolean;
  aceptaDatos: boolean;
  citas: number;
  ultimaCita: { inicio: string; estado: AppointmentStatus } | null;
}

function toClientSummary(dto: ClientSummaryDto): ClientSummary {
  return {
    id: dto.id,
    name: dto.nombre,
    phone: dto.telefono,
    hasAccount: dto.tieneCuenta,
    acceptsDataPolicy: dto.aceptaDatos,
    appointmentCount: dto.citas,
    lastAppointment: dto.ultimaCita && { start: dto.ultimaCita.inicio, status: dto.ultimaCita.estado },
  };
}

export const CLIENTS_PER_PAGE = 20;

/** Una página de clientes. search busca en el nombre o, si son números, en el teléfono */
export async function getClients(search: string, page: number): Promise<{ items: ClientSummary[]; total: number }> {
  const query = search ? `?buscar=${encodeURIComponent(search)}` : "";
  const result = await http.getPage<ClientSummaryDto>(`/panel/clientes${query}`, page, CLIENTS_PER_PAGE);
  return { items: result.items.map(toClientSummary), total: result.total };
}

export function useClients(search: string, page: number) {
  return useRequest(() => getClients(search, page), [search, page]);
}
