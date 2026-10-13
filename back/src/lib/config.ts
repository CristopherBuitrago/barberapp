import "dotenv/config";

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

export const config = {
  puerto: Number(process.env.PUERTO ?? 3000),
  frontOrigen: process.env.FRONT_ORIGEN ?? "http://localhost:5173",
  zonaDesfase: process.env.ZONA_DESFASE ?? "-05:00",
  intervaloMin: Number(process.env.INTERVALO_MIN ?? 30),
  agenteApiKey: requerida("AGENTE_API_KEY"),
  panelClave: requerida("PANEL_CLAVE"),
  descuentoRegistroPct: Number(process.env.DESCUENTO_REGISTRO_PCT ?? 10),
};
