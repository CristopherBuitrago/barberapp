import type { TeamMember } from "@/entities/barber";
import { localPhone } from "@/shared/lib";

/** Un día de la semana en el formulario: si trabaja y de qué hora a qué hora */
export interface DaySchedule {
  weekday: number;
  works: boolean;
  startTime: string;
  endTime: string;
}

export interface BarberFields {
  name: string;
  phone: string;
  week: DaySchedule[];
}

/** De lunes a domingo, que es como se piensa la semana en la barbería */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * La semana del barbero para editarla. Si un día tiene la jornada partida en dos se toma
 * de la primera hora a la última, porque el formulario maneja una por día
 */
export function weekOf(member: TeamMember | null): DaySchedule[] {
  return WEEK_ORDER.map((weekday) => {
    const own = member?.schedules.filter((s) => s.weekday === weekday) ?? [];
    if (!member) return { weekday, works: weekday !== 0, startTime: "09:00", endTime: "19:00" };
    if (!own.length) return { weekday, works: false, startTime: "09:00", endTime: "19:00" };
    const startTime = own.map((s) => s.startTime).sort()[0];
    const endTime = own.map((s) => s.endTime).sort().at(-1)!;
    return { weekday, works: true, startTime, endTime };
  });
}

export function fieldsOf(member: TeamMember | null): BarberFields {
  return { name: member?.name ?? "", phone: member?.phone ? localPhone(member.phone) : "", week: weekOf(member) };
}
