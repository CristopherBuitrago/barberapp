import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";

/**
 * Lee un secreto. En producción viene de un archivo (Docker secrets monta cada uno en
 * /run/secrets/<nombre en minúsculas>; NOMBRE_FILE permite otra ruta). En desarrollo,
 * si no hay archivo, cae a la variable de entorno del .env.
 */
export function secreto(nombre: string): string | undefined {
  const archivo = process.env[`${nombre}_FILE`] ?? `/run/secrets/${nombre.toLowerCase()}`;
  if (existsSync(archivo)) return readFileSync(archivo, "utf8").trim();
  return process.env[nombre];
}

export function secretoRequerido(nombre: string): string {
  const valor = secreto(nombre);
  if (!valor) throw new Error(`Falta el secreto ${nombre} (archivo en /run/secrets o variable de entorno)`);
  return valor;
}
