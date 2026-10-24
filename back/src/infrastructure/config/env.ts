import { requiredSecret } from "./secrets.js";

/** Configuración del back. Lo delicado sale de secretos, lo demás de variables normales. */
export interface AppConfig {
  port: number;
  /** Origen permitido para el front (CORS) */
  frontOrigin: string;
  /** Desfase de la barbería respecto a UTC, por ejemplo "-05:00" */
  timeZoneOffset: string;
  /** Cada cuántos minutos se ofrecen horas */
  slotIntervalMin: number;
  welcomeDiscountPct: number;
  databaseUrl: string;
  /** Clave que manda el agente de WhatsApp en el header x-api-key */
  agentApiKey: string;
  /** Con lo que se firman los JWT de sesión, mínimo 32 caracteres */
  jwtSecret: string;
  /** Minutos sin actividad para que la sesión se cierre sola */
  sessionMinutes: number;
  /** Cookie solo por HTTPS. En producción tiene que ir en true */
  cookieSecure: boolean;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PUERTO ?? 3000),
    frontOrigin: process.env.FRONT_ORIGEN ?? "http://localhost:5173",
    timeZoneOffset: process.env.ZONA_DESFASE ?? "-05:00",
    slotIntervalMin: Number(process.env.INTERVALO_MIN ?? 30),
    welcomeDiscountPct: Number(process.env.DESCUENTO_REGISTRO_PCT ?? 10),
    databaseUrl: requiredSecret("DATABASE_URL"),
    agentApiKey: requiredSecret("AGENTE_API_KEY"),
    jwtSecret: requiredSecret("JWT_SECRET"),
    sessionMinutes: Number(process.env.SESION_MINUTOS ?? 30),
    cookieSecure: process.env.COOKIE_SECURE === "true",
  };
}
