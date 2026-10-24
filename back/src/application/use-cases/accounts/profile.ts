import { Barber } from "../../../domain/entities/Barber.js";
import type { Client } from "../../../domain/entities/Client.js";
import type { Session } from "../../../domain/entities/Session.js";
import type { Profile } from "../../dtos/accounts.js";

/** El perfil de un cliente o de alguien del equipo. El equipo no tiene fecha de nacimiento. */
export function profileOf(person: Client | Barber): Profile {
  if (person instanceof Barber) {
    return { role: person.role, name: person.name, phone: person.phone ?? "", birthDate: null };
  }
  return {
    role: "CLIENTE",
    name: person.name,
    phone: person.phone,
    birthDate: person.birthDate ? person.birthDate.toISOString().slice(0, 10) : null,
  };
}

export function sessionProfile(session: Session): Profile {
  return profileOf(session.owner);
}

/** "YYYY-MM-DD" a medianoche UTC, que es como se guarda la fecha de nacimiento. */
export function toBirthDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}
