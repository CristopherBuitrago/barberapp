import type { Barber } from "./Barber.js";
import type { Client } from "./Client.js";

export type Role = "CLIENTE" | "BARBERO" | "ADMIN";

/** Sesión guardada. Es de un cliente o de alguien del equipo, nunca de los dos. */
export interface Session {
  id: number;
  /** SHA-256 del token, el token como tal nunca se guarda */
  tokenHash: string;
  clientId: number | null;
  barberId: number | null;
  expiresAt: Date;
}

export type SessionOwner = { clientId: number } | { barberId: number };

/** Quién está usando la app en esta petición. */
export type AuthSession =
  | { sessionId: number; role: "CLIENTE"; client: Client }
  | { sessionId: number; role: "BARBERO" | "ADMIN"; barber: Barber };

export function roleOf(barber: Barber): "BARBERO" | "ADMIN" {
  return barber.isAdmin ? "ADMIN" : "BARBERO";
}
