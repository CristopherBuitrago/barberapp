/**
 * Todas las respuestas de la API salen con la misma forma:
 *
 *   { "success": true,  "data": ..., "error": null }
 *   { "success": true,  "data": [...], "pagination": { "page", "perPage", "total" }, "error": null }
 *   { "success": false, "data": null, "error": { "code", "message", "details" } }
 *
 * La única excepción es GET /api/imagenes/:id, que devuelve la imagen tal cual.
 */
import type { Response } from "express";
import type { ErrorCode } from "../../domain/errors/ErrorCode.js";
import type { Page, PageRequest } from "../../domain/repositories/Pagination.js";

export interface ApiError {
  code: ErrorCode;
  /** Para mostrarle a la persona, en español */
  message: string;
  /** Más información cuando sirve, por ejemplo qué campo no pasó la validación */
  details: unknown;
}

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
}

export function sendData(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ success: true, data, error: null });
}

export function sendPage<T>(res: Response, page: Page<T>, request: PageRequest, present: (item: T) => unknown): void {
  const pagination: Pagination = { page: request.page, perPage: request.perPage, total: page.total };
  res.status(200).json({ success: true, data: page.items.map(present), pagination, error: null });
}

export function sendError(res: Response, status: number, code: ErrorCode, message: string, details: unknown = null): void {
  const error: ApiError = { code, message, details };
  res.status(status).json({ success: false, data: null, error });
}
