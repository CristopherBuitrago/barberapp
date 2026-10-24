import type { RequestHandler, Response } from "express";
import type { Barbero, Cliente } from "@prisma/client";
import { db } from "./db.js";
import { hashToken, nuevoToken } from "./claves.js";

const DURACION_MS = 30 * 24 * 60 * 60 * 1000;

export type Rol = "CLIENTE" | "BARBERO" | "ADMIN";

/** Quién inició sesión. Se guarda en res.locals.sesion. */
export type SesionActiva =
  | { sesionId: number; rol: "CLIENTE"; cliente: Cliente }
  | { sesionId: number; rol: "BARBERO" | "ADMIN"; barbero: Barbero };

export async function crearSesion(duenio: { clienteId: number } | { barberoId: number }): Promise<string> {
  const { token, tokenHash } = nuevoToken();
  await db.sesion.create({ data: { ...duenio, tokenHash, expira: new Date(Date.now() + DURACION_MS) } });
  return token;
}

export async function cerrarSesion(sesionId: number) {
  await db.sesion.delete({ where: { id: sesionId } }).catch(() => {});
}

/** Lee el header Authorization: Bearer <token> y deja la sesión en res.locals.sesion (si es válida). */
export const leerSesion: RequestHandler = async (req, res, next) => {
  const token = req.header("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (token) {
    const sesion = await db.sesion.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { cliente: true, barbero: true },
    });
    if (sesion && sesion.expira > new Date()) {
      if (sesion.cliente) {
        res.locals.sesion = { sesionId: sesion.id, rol: "CLIENTE", cliente: sesion.cliente } satisfies SesionActiva;
      } else if (sesion.barbero?.activo) {
        res.locals.sesion = {
          sesionId: sesion.id,
          rol: sesion.barbero.esAdmin ? "ADMIN" : "BARBERO",
          barbero: sesion.barbero,
        } satisfies SesionActiva;
      }
    }
  }
  next();
};

export function sesionDe(res: Response): SesionActiva | undefined {
  return res.locals.sesion as SesionActiva | undefined;
}

export const requiereSesion: RequestHandler = (_req, res, next) => {
  if (!sesionDe(res)) {
    res.status(401).json({ error: "Inicia sesión para continuar" });
    return;
  }
  next();
};

/** Solo barberos y admin (el panel). */
export const soloEquipo: RequestHandler = (_req, res, next) => {
  const sesion = sesionDe(res);
  if (!sesion || sesion.rol === "CLIENTE") {
    res.status(401).json({ error: "Inicia sesión con una cuenta del equipo" });
    return;
  }
  next();
};

/** Solo el admin (catálogo de servicios). Va después de soloEquipo. */
export const soloAdmin: RequestHandler = (_req, res, next) => {
  if (sesionDe(res)?.rol !== "ADMIN") {
    res.status(403).json({ error: "Solo el administrador puede hacer esto" });
    return;
  }
  next();
};

/** Datos de la cuenta que ve el front. */
export function presentarUsuario(sesion: SesionActiva) {
  if (sesion.rol === "CLIENTE") {
    const c = sesion.cliente;
    return {
      rol: sesion.rol,
      nombre: c.nombre,
      telefono: c.telefono,
      fechaNacimiento: c.fechaNacimiento ? c.fechaNacimiento.toISOString().slice(0, 10) : null,
    };
  }
  return { rol: sesion.rol, nombre: sesion.barbero.nombre, telefono: sesion.barbero.telefono ?? "", fechaNacimiento: null };
}
