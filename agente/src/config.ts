import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";

/**
 * Lee un secreto. En producción viene de un archivo (Docker secrets monta cada uno en
 * /run/secrets/<nombre en minúsculas>; NOMBRE_FILE permite otra ruta). En desarrollo,
 * si no hay archivo, cae a la variable de entorno del .env.
 */
function secreto(nombre: string): string | undefined {
  const archivo = process.env[`${nombre}_FILE`] ?? `/run/secrets/${nombre.toLowerCase()}`;
  if (existsSync(archivo)) return readFileSync(archivo, "utf8").trim();
  return process.env[nombre];
}

function requerido(nombre: string): string {
  const valor = secreto(nombre);
  if (!valor) throw new Error(`Falta el secreto ${nombre} (archivo en /run/secrets o variable de entorno)`);
  return valor;
}

export const config = {
  puerto: Number(process.env.PUERTO ?? 3001),
  whatsapp: {
    // Se validan en index.ts; el chat de consola no las necesita.
    token: secreto("WHATSAPP_TOKEN") ?? "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    verifyToken: secreto("WHATSAPP_VERIFY_TOKEN") ?? "",
    appSecret: secreto("WHATSAPP_APP_SECRET") ?? "",
    graphVersion: process.env.GRAPH_API_VERSION ?? "v23.0",
  },
  claude: {
    apiKey: secreto("ANTHROPIC_API_KEY"),
    modelo: process.env.CLAUDE_MODELO ?? "claude-opus-5-5",
    esfuerzo: (process.env.CLAUDE_ESFUERZO ?? "low") as "low" | "medium" | "high",
  },
  back: {
    url: process.env.BACK_URL ?? "http://localhost:3000",
    apiKey: requerido("BACK_API_KEY"),
  },
  barberia: {
    nombre: process.env.BARBERIA_NOMBRE ?? "la barbería",
    direccion: process.env.BARBERIA_DIRECCION ?? "",
    telefonoAvisos: process.env.BARBERIA_TELEFONO_AVISOS ?? "",
    politicaDatosUrl: process.env.POLITICA_DATOS_URL ?? "",
    descuentoRegistroPct: Number(process.env.DESCUENTO_REGISTRO_PCT ?? 10),
    webUrl: process.env.WEB_URL ?? "",
  },
  zonaDesfase: process.env.ZONA_DESFASE ?? "-05:00",
  horasSesion: Number(process.env.HORAS_SESION ?? 6),
  simuladorActivo: process.env.SIMULADOR_ACTIVO === "true",
};
