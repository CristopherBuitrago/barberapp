import { http } from "@/shared/api";
import { useRequest } from "@/shared/lib";
import type { Barber, TeamMember } from "../model/types";

/** Como lo manda la API */
export interface BarberDto {
  id: number;
  nombre: string;
}

interface TeamMemberDto extends BarberDto {
  telefono: string | null;
  activo: boolean;
  esAdmin: boolean;
  horarios: { id: number; diaSemana: number; horaInicio: string; horaFin: string }[];
}

export function toBarber(dto: BarberDto): Barber {
  return { id: dto.id, name: dto.nombre };
}

function toTeamMember(dto: TeamMemberDto): TeamMember {
  return {
    ...toBarber(dto),
    phone: dto.telefono,
    active: dto.activo,
    isAdmin: dto.esAdmin,
    schedules: dto.horarios.map((h) => ({ id: h.id, weekday: h.diaSemana, startTime: h.horaInicio, endTime: h.horaFin })),
  };
}

/** Los barberos que el cliente puede elegir */
export async function getBarbers(): Promise<Barber[]> {
  return (await http.getAll<BarberDto>("/barberos")).map(toBarber);
}

/** Todo el equipo con sus horarios, para el panel */
export async function getTeam(): Promise<TeamMember[]> {
  return (await http.getAll<TeamMemberDto>("/panel/barberos")).map(toTeamMember);
}

export function useBarbers() {
  return useRequest(getBarbers, []);
}

export function useTeam() {
  return useRequest(getTeam, []);
}
