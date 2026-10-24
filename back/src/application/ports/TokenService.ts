/** Tokens de sesión. El token va al navegador y a la base solo llega su hash. */
export interface TokenService {
  generate(): { token: string; tokenHash: string };
  hash(token: string): string;
}
