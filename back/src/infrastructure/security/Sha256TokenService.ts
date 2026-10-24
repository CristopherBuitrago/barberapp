import { createHash, randomBytes } from "node:crypto";
import type { TokenService } from "../../application/ports/TokenService.js";

/** Token aleatorio para la sesión. En la base solo se guarda su SHA-256. */
export class Sha256TokenService implements TokenService {
  generate(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString("base64url");
    return { token, tokenHash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
