import { toUser, type User, type UserDto } from "@/entities/session";
import { http } from "@/shared/api";

/** El equipo solo cambia el nombre. Los clientes también la fecha de nacimiento, null la borra */
export async function updateProfile(data: { name: string; birthDate?: string | null }): Promise<User> {
  const body = data.birthDate === undefined ? { nombre: data.name } : { nombre: data.name, fechaNacimiento: data.birthDate };
  return toUser(await http.patch<UserDto>("/cuenta/yo", body));
}
