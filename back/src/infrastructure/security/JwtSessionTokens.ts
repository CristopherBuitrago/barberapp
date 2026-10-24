import { SignJWT, jwtVerify } from "jose";
import type { SessionTokens } from "../../application/ports/SessionTokens.js";
import type { SessionClaims } from "../../domain/entities/Session.js";

const ALGORITHM = "HS256";
const ISSUER = "barberia";

/**
 * JWT firmado con HS256 y el secreto JWT_SECRET. El dueño va en "sub" como
 * "client:12" o "barber:3".
 */
export class JwtSessionTokens implements SessionTokens {
  private readonly key: Uint8Array;

  constructor(secret: string) {
    if (secret.length < 32) throw new Error("JWT_SECRET tiene que tener al menos 32 caracteres");
    this.key = new TextEncoder().encode(secret);
  }

  sign(claims: SessionClaims, expiresAt: Date): Promise<string> {
    return new SignJWT()
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(`${claims.ownerKind}:${claims.ownerId}`)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.key);
  }

  async verify(token: string): Promise<{ claims: SessionClaims; expiresAt: Date } | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: [ALGORITHM], issuer: ISSUER });
      const match = /^(client|barber):(\d+)$/.exec(payload.sub ?? "");
      if (!match || !payload.exp) return null;
      return {
        claims: { ownerKind: match[1] as SessionClaims["ownerKind"], ownerId: Number(match[2]) },
        expiresAt: new Date(payload.exp * 1000),
      };
    } catch {
      // Firma mala, token dañado o vencido: es como no tener sesión
      return null;
    }
  }
}
