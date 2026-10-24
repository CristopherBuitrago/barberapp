export type Role = "CLIENTE" | "BARBERO" | "ADMIN";

/** Quien inició sesión */
export interface User {
  role: Role;
  name: string;
  /** Con indicativo, "573001234567" */
  phone: string;
  /** "YYYY-MM-DD", siempre null para el equipo */
  birthDate: string | null;
}

/** Lo que se guarda en el navegador */
export interface StoredSession {
  token: string;
  user: User;
}
