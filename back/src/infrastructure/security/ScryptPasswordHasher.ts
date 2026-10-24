import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PasswordHasher } from "../../application/ports/PasswordHasher.js";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, length: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

/** Contraseñas con scrypt. Se guardan como "scrypt$<sal>$<hash>" en base64url. */
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const hash = await scryptAsync(password, salt, KEY_LENGTH);
    return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, salt, hash] = storedHash.split("$");
    if (algorithm !== "scrypt" || !salt || !hash) return false;
    const expected = Buffer.from(hash, "base64url");
    const actual = await scryptAsync(password, Buffer.from(salt, "base64url"), expected.length);
    return timingSafeEqual(expected, actual);
  }
}
