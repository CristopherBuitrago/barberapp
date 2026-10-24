import { http } from "@/shared/api";
import type { Role, User } from "../model/types";

/** Como lo manda la API */
export interface UserDto {
  rol: Role;
  nombre: string;
  telefono: string;
  fechaNacimiento: string | null;
}

/** Lo que responden el login y el registro. El token no viene aquí, llega en la cookie httpOnly */
export interface SessionDto {
  usuario: UserDto;
}

export function toUser(dto: UserDto): User {
  return { role: dto.rol, name: dto.nombre, phone: dto.telefono, birthDate: dto.fechaNacimiento };
}



/** Los datos al día de quien tiene la sesión */
export async function getMe(): Promise<User> {
  return toUser(await http.get<UserDto>("/cuenta/yo"));
}

export async function logout(): Promise<void> {
  await http.post<null>("/cuenta/logout");
}
