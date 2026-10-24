import type { Barber } from "../../../domain/entities/Barber.js";
import type { Client } from "../../../domain/entities/Client.js";
import { roleOf, type AuthSession } from "../../../domain/entities/Session.js";
import type { Profile } from "../../dtos/accounts.js";

export function clientProfile(client: Client): Profile {
  return {
    role: "CLIENTE",
    name: client.name,
    phone: client.phone,
    birthDate: client.birthDate ? client.birthDate.toISOString().slice(0, 10) : null,
  };
}

/** El equipo no tiene fecha de nacimiento en el perfil. */
export function teamProfile(barber: Barber): Profile {
  return { role: roleOf(barber), name: barber.name, phone: barber.phone ?? "", birthDate: null };
}

export function profileOf(session: AuthSession): Profile {
  return session.role === "CLIENTE" ? clientProfile(session.client) : teamProfile(session.barber);
}

/** "YYYY-MM-DD" a medianoche UTC, que es como se guarda la fecha de nacimiento. */
export function toBirthDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}
