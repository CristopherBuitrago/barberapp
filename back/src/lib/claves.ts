import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (clave: string, sal: Buffer, largo: number) => Promise<Buffer>;
const LARGO = 64;

/** Hash de contraseña con scrypt: "scrypt$<sal>$<hash>" en base64url. */
export async function hashClave(clave: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scryptAsync(clave, sal, LARGO);
  return `scrypt$${sal.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verificarClave(clave: string, guardado: string): Promise<boolean> {
  const [algoritmo, sal, hash] = guardado.split("$");
  if (algoritmo !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64url");
  const calculado = await scryptAsync(clave, Buffer.from(sal, "base64url"), esperado.length);
  return timingSafeEqual(esperado, calculado);
}

/** Token de sesión aleatorio (va al navegador) y su SHA-256 (va a la base). */
export function nuevoToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
