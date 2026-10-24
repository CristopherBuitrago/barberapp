import type { Role, Session } from "../../domain/entities/Session.js";

export interface LoginInput {
  phone: string;
  password: string;
}

export interface RegisterClientInput {
  name: string;
  phone: string;
  password: string;
  /** "YYYY-MM-DD" */
  birthDate?: string;
}

export interface UpdateProfileInput {
  session: Session;
  name: string;
  /** "YYYY-MM-DD", null para borrarla, undefined para dejarla igual. Solo aplica a clientes */
  birthDate?: string | null;
}

/** Los datos de la cuenta que ve la persona. */
export interface Profile {
  role: Role;
  name: string;
  phone: string;
  /** "YYYY-MM-DD", siempre null para el equipo */
  birthDate: string | null;
}

/** El token firmado y cuándo vence, para ponerlo en la cookie */
export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

export interface LoginResult {
  session: IssuedToken;
  profile: Profile;
}

export interface RegisterResult extends LoginResult {
  welcomeDiscountPct: number;
}
