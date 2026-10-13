import type { RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

function iguales(a: string | undefined, b: string): boolean {
  if (!a) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function esAgente(clave: string | undefined): boolean {
  return iguales(clave, config.agenteApiKey);
}

/** Solo el agente de WhatsApp (header x-api-key). */
export const soloAgente: RequestHandler = (req, res, next) => {
  if (!esAgente(req.header("x-api-key"))) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  next();
};

/** Solo el panel de la barbería (header x-panel-clave). */
export const soloPanel: RequestHandler = (req, res, next) => {
  if (!iguales(req.header("x-panel-clave"), config.panelClave)) {
    res.status(401).json({ error: "Clave del panel incorrecta" });
    return;
  }
  next();
};
