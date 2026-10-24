import { toBarber, type BarberDto } from "@/entities/barber/@x/slot";
import { http } from "@/shared/api";
import type { Slot } from "../model/types";

interface SlotDto {
  inicio: string;
  barberos: BarberDto[];
}

/** Las horas libres de un día. Sin barbero junta las de todos */
export async function getAvailability(serviceId: number, date: string, barberId?: number): Promise<Slot[]> {
  const query = `servicioId=${serviceId}&fecha=${date}${barberId ? `&barberoId=${barberId}` : ""}`;
  const slots = await http.getAll<SlotDto>(`/disponibilidad?${query}`);
  return slots.map((s) => ({ start: s.inicio, barbers: s.barberos.map(toBarber) }));
}
