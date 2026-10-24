import { toTimeBlock, type TimeBlock, type TimeBlockDto } from "@/entities/time-block";
import { http } from "@/shared/api";

export async function createTimeBlock(block: { barberId: number; start: string; end: string; reason: string }): Promise<TimeBlock> {
  const body = { barberoId: block.barberId, inicio: block.start, fin: block.end, motivo: block.reason };
  return toTimeBlock(await http.post<TimeBlockDto>("/panel/bloqueos", body));
}

export async function deleteTimeBlock(id: number): Promise<void> {
  await http.delete<null>(`/panel/bloqueos/${id}`);
}
