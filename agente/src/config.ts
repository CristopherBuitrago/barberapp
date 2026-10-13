import "dotenv/config";

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

export const config = {
  puerto: Number(process.env.PUERTO ?? 3001),
  whatsapp: {
    // Se validan en index.ts; el chat de consola no las necesita.
    token: process.env.WHATSAPP_TOKEN ?? "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
    appSecret: process.env.WHATSAPP_APP_SECRET ?? "",
    graphVersion: process.env.GRAPH_API_VERSION ?? "v23.0",
  },
  claude: {
    modelo: process.env.CLAUDE_MODELO ?? "claude-opus-5-5",
    esfuerzo: (process.env.CLAUDE_ESFUERZO ?? "low") as "low" | "medium" | "high",
  },
  back: {
    url: process.env.BACK_URL ?? "http://localhost:3000",
    apiKey: requerida("BACK_API_KEY"),
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
