import { secretoRequerido } from "./secretos.js";

export const config = {
  puerto: Number(process.env.PUERTO ?? 3000),
  frontOrigen: process.env.FRONT_ORIGEN ?? "http://localhost:5173",
  zonaDesfase: process.env.ZONA_DESFASE ?? "-05:00",
  intervaloMin: Number(process.env.INTERVALO_MIN ?? 30),
  agenteApiKey: secretoRequerido("AGENTE_API_KEY"),
  descuentoRegistroPct: Number(process.env.DESCUENTO_REGISTRO_PCT ?? 10),
};
