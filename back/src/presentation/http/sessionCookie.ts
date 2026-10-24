import type { Request, Response } from "express";
import type { IssuedToken } from "../../application/dtos/accounts.js";

/** La cookie donde va el JWT de la sesión. httpOnly: el JavaScript de la página no la puede leer */
export const SESSION_COOKIE = "barberia_session";

export interface CookieOptions {
  /** Solo por HTTPS (producción) */
  secure: boolean;
}

/** Lax deja que la cookie vaya al abrir la web desde un enlace, pero no en peticiones de otros sitios */
function base(options: CookieOptions) {
  return { httpOnly: true, secure: options.secure, sameSite: "lax" as const, path: "/" };
}

export function setSessionCookie(res: Response, issued: IssuedToken, options: CookieOptions): void {
  res.cookie(SESSION_COOKIE, issued.token, { ...base(options), expires: issued.expiresAt });
}

export function clearSessionCookie(res: Response, options: CookieOptions): void {
  res.clearCookie(SESSION_COOKIE, base(options));
}

/** Lee una cookie del header sin librerías: "a=1; b=2" */
export function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.header("cookie") ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}
