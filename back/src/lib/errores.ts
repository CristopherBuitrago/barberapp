import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

/** Error esperado del negocio: se devuelve al cliente con su código HTTP. */
export class ErrorNegocio extends Error {
  constructor(
    public readonly status: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export const manejadorErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ErrorNegocio) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Datos inválidos", detalle: err.issues });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Error interno" });
};
