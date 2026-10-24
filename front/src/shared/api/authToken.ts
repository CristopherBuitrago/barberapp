/**
 * El cliente HTTP necesita el token de la sesión, pero la sesión vive en entities/session,
 * que está más arriba. Por eso la sesión se registra aquí y el cliente solo pregunta.
 */
let readToken: () => string | null = () => null;
let onExpired: () => void = () => {};

export const authToken = {
  get: () => readToken(),
  /** El back respondió 401 con un token: la sesión venció o la cerraron */
  expired: () => onExpired(),
  register(source: { read: () => string | null; onExpired: () => void }) {
    readToken = source.read;
    onExpired = source.onExpired;
  },
};
