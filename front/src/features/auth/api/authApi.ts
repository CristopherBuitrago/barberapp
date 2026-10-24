import { toUser, type SessionDto, type User } from "@/entities/session";
import { http } from "@/shared/api";

/** El back deja la sesión en una cookie httpOnly, aquí solo vuelven los datos de la persona */
export async function login(phone: string, password: string): Promise<User> {
  return toUser((await http.post<SessionDto>("/cuenta/login", { telefono: phone, clave: password })).usuario);
}

/** Crea la cuenta de cliente. welcomeDiscountPct es el descuento para su próxima cita */
export async function register(data: {
  name: string;
  phone: string;
  password: string;
  birthDate?: string;
}): Promise<{ user: User; welcomeDiscountPct: number }> {
  const result = await http.post<SessionDto & { descuentoPct: number }>("/cuenta/registro", {
    nombre: data.name,
    telefono: data.phone,
    clave: data.password,
    fechaNacimiento: data.birthDate,
    aceptaDatos: true,
  });
  return { user: toUser(result.usuario), welcomeDiscountPct: result.descuentoPct };
}
