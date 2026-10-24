import type { SessionClaims } from "../../domain/entities/Session.js";

/** Firma y revisa los tokens de sesión (JWT). */
export interface SessionTokens {
  sign(claims: SessionClaims, expiresAt: Date): Promise<string>;
  /** Null si la firma no sirve o ya venció */
  verify(token: string): Promise<{ claims: SessionClaims; expiresAt: Date } | null>;
}
