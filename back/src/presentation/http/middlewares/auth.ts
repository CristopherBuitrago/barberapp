import type { Request, RequestHandler, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import type { AuthenticateSession } from "../../../application/use-cases/accounts/AuthenticateSession.js";
import type { Session } from "../../../domain/entities/Session.js";
import { ErrorCode } from "../../../domain/errors/ErrorCode.js";
import { sendError } from "../responses.js";
import { SESSION_COOKIE, clearSessionCookie, readCookie, setSessionCookie, type CookieOptions } from "../sessionCookie.js";

/** Compara dos claves sin dar pistas por lo que se demora. */
function safeEqual(a: string | undefined, b: string): boolean {
  if (!a) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Lee el JWT de la cookie y deja la sesión en res.locals si sirve. Cada petición con sesión
 * le devuelve al navegador un token nuevo con otros 30 minutos. Si el token ya no sirve,
 * se borra la cookie.
 */
export function readSession(authenticate: AuthenticateSession, cookie: CookieOptions): RequestHandler {
  return async (req, res, next) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return next();
    const result = await authenticate.execute(token);
    if (result) {
      res.locals.session = result.session;
      setSessionCookie(res, result.renewed, cookie);
    } else {
      clearSessionCookie(res, cookie);
    }
    next();
  };
}

export function sessionOf(res: Response): Session | undefined {
  return (res.locals.session as Session | null | undefined) ?? undefined;
}

/** Para las rutas que siempre van detrás de requireSession o requireTeam. */
export function requiredSession(res: Response): Session {
  const session = sessionOf(res);
  if (!session) throw new Error("Esta ruta debería ir detrás de requireSession");
  return session;
}

export const requireSession: RequestHandler = (_req, res, next) => {
  if (!sessionOf(res)) {
    sendError(res, 401, ErrorCode.AuthRequired, "Inicia sesión para continuar");
    return;
  }
  next();
};

/** Solo barberos y admin, o sea el panel. */
export const requireTeam: RequestHandler = (_req, res, next) => {
  const session = sessionOf(res);
  if (!session?.isTeam) {
    sendError(res, 401, ErrorCode.TeamOnly, "Inicia sesión con una cuenta del equipo");
    return;
  }
  next();
};

/** Solo el admin. Va después de requireTeam. */
export const requireAdmin: RequestHandler = (_req, res, next) => {
  if (sessionOf(res)?.role !== "ADMIN") {
    sendError(res, 403, ErrorCode.AdminOnly, "Solo el administrador puede hacer esto");
    return;
  }
  next();
};

/** Si la petición viene del agente de WhatsApp (header x-api-key). */
export function isAgent(req: Request, agentApiKey: string): boolean {
  return safeEqual(req.header("x-api-key"), agentApiKey);
}

export function requireAgent(agentApiKey: string): RequestHandler {
  return (req, res, next) => {
    if (!isAgent(req, agentApiKey)) {
      sendError(res, 401, ErrorCode.InvalidApiKey, "No autorizado");
      return;
    }
    next();
  };
}
