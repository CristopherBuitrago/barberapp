import { toStoredSession, type SessionDto, type StoredSession } from "@/entities/session";
import { http } from "@/shared/api";

export async function login(phone: string, password: string): Promise<StoredSession> {
  return toStoredSession(await http.post<SessionDto>("/cuenta/login", { telefono: phone, clave: password }));
}

/** Crea la cuenta de cliente. welcomeDiscountPct es el descuento para su próxima cita */
export async function register(data: {
  name: string;
  phone: string;
  password: string;
  birthDate?: string;
}): Promise<{ session: StoredSession; welcomeDiscountPct: number }> {
  const result = await http.post<SessionDto & { descuentoPct: number }>("/cuenta/registro", {
    nombre: data.name,
    telefono: data.phone,
    clave: data.password,
    fechaNacimiento: data.birthDate,
    aceptaDatos: true,
  });
  return { session: toStoredSession(result), welcomeDiscountPct: result.descuentoPct };
}
