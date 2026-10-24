import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../../domain/errors/DomainError.js";
import { ErrorCode } from "../../../domain/errors/ErrorCode.js";
import { sendError } from "../responses.js";

function statusOf(error: DomainError): number {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof ForbiddenError) return 403;
  return 400;
}

/** Convierte los errores en la respuesta de siempre. Lo que no se esperaba queda en el log y sale como 500. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof DomainError) {
    sendError(res, statusOf(error), error.code, error.message);
    return;
  }
  if (error instanceof ZodError) {
    // Por cada campo que no pasó: dónde está y qué le pasa
    const details = error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }));
    sendError(res, 400, ErrorCode.ValidationError, "Datos inválidos", details);
    return;
  }
  // Los que lanza Express al leer el cuerpo: archivo muy pesado o JSON mal escrito
  if (error?.type === "entity.too.large") {
    sendError(res, 413, ErrorCode.PayloadTooLarge, "El archivo pesa más de lo permitido");
    return;
  }
  if (error?.type === "entity.parse.failed") {
    sendError(res, 400, ErrorCode.InvalidJson, "El cuerpo de la petición no es un JSON válido");
    return;
  }
  console.error(error);
  sendError(res, 500, ErrorCode.InternalError, "Error interno");
};

/** Una ruta que no existe también responde con el sobre de siempre. */
export const routeNotFound: RequestHandler = (req, res) => {
  sendError(res, 404, ErrorCode.RouteNotFound, `No existe la ruta ${req.method} ${req.path}`);
};
