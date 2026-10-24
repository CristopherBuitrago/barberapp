import { Barber } from "./Barber.js";
import { Client } from "./Client.js";

export type Role = "CLIENTE" | "BARBERO" | "ADMIN";

/** Lo que va firmado dentro del token: de quién es la sesión. */
export interface SessionClaims {
  ownerKind: "client" | "barber";
  ownerId: number;
}

/**
 * La sesión de quien está usando la web. No se guarda en la base: viaja en un token
 * firmado y en cada petición se vuelve a armar con el dueño traído de la base.
 */
export class Session {
  constructor(
    private readonly _owner: Client | Barber,
    private readonly _expiresAt: Date,
  ) {}

  /** Lo que se firma en el token para esta persona */
  static claimsOf(owner: Client | Barber): SessionClaims {
    return { ownerKind: owner instanceof Client ? "client" : "barber", ownerId: owner.id };
  }

  get owner(): Client | Barber {
    return this._owner;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get role(): Role {
    return this._owner instanceof Client ? "CLIENTE" : this._owner.role;
  }

  /** El cliente dueño, o null si es del equipo */
  get client(): Client | null {
    return this._owner instanceof Client ? this._owner : null;
  }

  /** El barbero o admin dueño, o null si es de un cliente */
  get barber(): Barber | null {
    return this._owner instanceof Barber ? this._owner : null;
  }

  get isTeam(): boolean {
    return this._owner instanceof Barber;
  }

  /** A un barbero que desactivaron se le cae la sesión de una vez, aunque el token no haya vencido */
  get ownerCanUseIt(): boolean {
    return this._owner instanceof Barber ? this._owner.active : true;
  }
}
