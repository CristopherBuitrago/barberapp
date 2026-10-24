import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";

/**
 * Lee un secreto. En producción sale de un archivo, porque Docker monta cada secreto en
 * /run/secrets/<nombre en minúsculas> (con NOMBRE_FILE se puede poner otra ruta).
 * En desarrollo, si no hay archivo, usa la variable del .env.
 */
export function secret(name: string): string | undefined {
  const file = process.env[`${name}_FILE`] ?? `/run/secrets/${name.toLowerCase()}`;
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  return process.env[name];
}

export function requiredSecret(name: string): string {
  const value = secret(name);
  if (!value) throw new Error(`Falta el secreto ${name} (archivo en /run/secrets o variable de entorno)`);
  return value;
}
