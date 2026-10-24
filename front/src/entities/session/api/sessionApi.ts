import { http } from "@/shared/api";
import type { Role, StoredSession, User } from "../model/types";

/** Como lo manda la API */
export interface UserDto {
  rol: Role;
  nombre: string;
  telefono: string;
  fechaNacimiento: string | null;
}

export interface SessionDto {
  token: string;
  usuario: UserDto;
}

export function toUser(dto: UserDto): User {
  return { role: dto.rol, name: dto.nombre, phone: dto.telefono, birthDate: dto.fechaNacimiento };
}

export function toStoredSession(dto: SessionDto): StoredSession {
  return { token: dto.token, user: toUser(dto.usuario) };
}

/** Los datos al día de quien tiene la sesión */
export async function getMe(): Promise<User> {
  return toUser(await http.get<UserDto>("/cuenta/yo"));
}

export async function logout(): Promise<void> {
  await http.post<null>("/cuenta/logout");
}
