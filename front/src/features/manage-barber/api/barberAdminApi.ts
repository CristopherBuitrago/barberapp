import { toTeamMember, type TeamMember, type TeamMemberDto } from "@/entities/barber";
import { http } from "@/shared/api";
import type { BarberFields, DaySchedule } from "../lib/week";

/** Como espera la API la semana: una jornada por cada día que trabaja */
function toSchedulesBody(week: DaySchedule[]) {
  return week
    .filter((d) => d.works)
    .map((d) => ({ diaSemana: d.weekday, horaInicio: d.startTime, horaFin: d.endTime }));
}

function toBarberBody(fields: BarberFields) {
  return { nombre: fields.name, telefono: fields.phone.trim() || null, horarios: toSchedulesBody(fields.week) };
}

export async function createBarber(fields: BarberFields): Promise<TeamMember> {
  return toTeamMember(await http.post<TeamMemberDto>("/panel/barberos", toBarberBody(fields)));
}

export async function updateBarber(id: number, fields: BarberFields): Promise<TeamMember> {
  return toTeamMember(await http.patch<TeamMemberDto>(`/panel/barberos/${id}`, toBarberBody(fields)));
}

/** Activar o desactivar sin tocar lo demás */
export async function setBarberActive(id: number, active: boolean): Promise<TeamMember> {
  return toTeamMember(await http.patch<TeamMemberDto>(`/panel/barberos/${id}`, { activo: active }));
}

/** Le da cuenta del panel o le cambia la contraseña */
export async function giveBarberAccount(id: number, password: string): Promise<TeamMember> {
  return toTeamMember(await http.put<TeamMemberDto>(`/panel/barberos/${id}/cuenta`, { clave: password }));
}
