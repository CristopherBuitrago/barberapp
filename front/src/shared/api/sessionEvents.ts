/**
 * La sesión va en una cookie httpOnly que el navegador manda solo, así que el front nunca ve
 * el token. Lo único que necesita saber es cuándo el back dice que ya no hay sesión, para
 * olvidar a la persona. La sesión vive en entities/session, que está más arriba, por eso se
 * registra aquí y el cliente HTTP solo avisa.
 */
let onExpired: () => void = () => {};

export const sessionEvents = {
  /** El back respondió 401: la sesión venció por inactividad o la cerraron */
  expired: () => onExpired(),
  onExpired(callback: () => void) {
    onExpired = callback;
  },
};
