import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  RuleViolationError,
  UnauthorizedError,
} from "../../../domain/errors/DomainError.js";

function statusOf(error: DomainError): number {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof RuleViolationError) return 400;
  return 400;
}

/** Convierte los errores en la respuesta HTTP. Lo que no se esperaba queda en el log y sale como 500. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof DomainError) {
    res.status(statusOf(error)).json({ error: error.message });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Datos inválidos", detalle: error.issues });
    return;
  }
  // Los que lanza Express al leer el cuerpo: archivo muy pesado o JSON mal escrito
  if (error?.type === "entity.too.large") {
    res.status(413).json({ error: "El archivo pesa más de lo permitido" });
    return;
  }
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ error: "El cuerpo de la petición no es un JSON válido" });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Error interno" });
};
