import { toBarber, type BarberDto } from "@/entities/barber/@x/time-block";
import { http } from "@/shared/api";
import type { TimeBlock } from "../model/types";

/** Como lo manda la API */
export interface TimeBlockDto {
  id: number;
  barberoId: number;
  inicio: string;
  fin: string;
  motivo: string;
  barbero: BarberDto;
}

export function toTimeBlock(dto: TimeBlockDto): TimeBlock {
  return { id: dto.id, start: dto.inicio, end: dto.fin, reason: dto.motivo, barber: toBarber(dto.barbero) };
}

/** Bloqueos de todos los barberos entre dos fechas, las dos incluidas */
export async function getTimeBlocks(from: string, to: string): Promise<TimeBlock[]> {
  return (await http.getAll<TimeBlockDto>(`/panel/bloqueos?desde=${from}&hasta=${to}`)).map(toTimeBlock);
}
