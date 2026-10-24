import type { Request, RequestHandler, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import type { AuthenticateSession } from "../../../application/use-cases/accounts/AuthenticateSession.js";
import type { Session } from "../../../domain/entities/Session.js";

/** Compara dos claves sin dar pistas por lo que se demora. */
function safeEqual(a: string | undefined, b: string): boolean {
  if (!a) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Lee el header Authorization: Bearer <token> y deja la sesión en res.locals si sirve. */
export function readSession(authenticate: AuthenticateSession): RequestHandler {
  return async (req, res, next) => {
    const token = req.header("authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (token) res.locals.session = await authenticate.execute(token);
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
    res.status(401).json({ error: "Inicia sesión para continuar" });
    return;
  }
  next();
};

/** Solo barberos y admin, o sea el panel. */
export const requireTeam: RequestHandler = (_req, res, next) => {
  const session = sessionOf(res);
  if (!session?.isTeam) {
    res.status(401).json({ error: "Inicia sesión con una cuenta del equipo" });
    return;
  }
  next();
};

/** Solo el admin. Va después de requireTeam. */
export const requireAdmin: RequestHandler = (_req, res, next) => {
  if (sessionOf(res)?.role !== "ADMIN") {
    res.status(403).json({ error: "Solo el administrador puede hacer esto" });
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
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    next();
  };
}
