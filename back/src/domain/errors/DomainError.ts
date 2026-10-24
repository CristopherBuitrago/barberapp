/**
 * Errores esperados del negocio. El mensaje le llega tal cual al usuario, por eso va en español.
 * La capa HTTP decide qué código devuelve con cada uno.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Lo que buscan no existe (o no es de quien lo pide). */
export class NotFoundError extends DomainError {}

/** Choca con algo que ya está, como una hora ocupada o una cuenta repetida. */
export class ConflictError extends DomainError {}

/** Los datos no cumplen una regla, como reservar en el pasado o un precio negativo. */
export class RuleViolationError extends DomainError {}

/** No inició sesión o las credenciales no sirven. */
export class UnauthorizedError extends DomainError {}

/** Tiene sesión pero no le toca hacer eso. */
export class ForbiddenError extends DomainError {}

/** Para los set: si la condición no se cumple, lanza el error con ese mensaje. */
export function ensure(condition: boolean, message: string): void {
  if (!condition) throw new RuleViolationError(message);
}
