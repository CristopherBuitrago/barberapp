import { Barber } from "./Barber.js";
import { Client } from "./Client.js";
import { Entity } from "./Entity.js";

export type Role = "CLIENTE" | "BARBERO" | "ADMIN";

export interface SessionData {
  /** SHA-256 del token, el token como tal nunca se guarda */
  tokenHash: string;
  /** De quién es: un cliente o alguien del equipo, nunca los dos */
  owner: Client | Barber;
  expiresAt: Date;
}

/** Sesión iniciada en la web. */
export class Session extends Entity {
  private readonly _tokenHash: string;
  private readonly _owner: Client | Barber;
  private _expiresAt: Date;

  private constructor(data: SessionData, id?: number) {
    super(id);
    this._tokenHash = data.tokenHash;
    this._owner = data.owner;
    this._expiresAt = data.expiresAt;
  }

  static open(owner: Client | Barber, tokenHash: string, expiresAt: Date): Session {
    return new Session({ owner, tokenHash, expiresAt });
  }

  /** Para armarla desde la base */
  static restore(id: number, data: SessionData): Session {
    return new Session(data, id);
  }

  get tokenHash(): string {
    return this._tokenHash;
  }

  get owner(): Client | Barber {
    return this._owner;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  set expiresAt(value: Date) {
    this._expiresAt = value;
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

  /** Sirve si no ha vencido y, si es del equipo, el barbero sigue activo */
  isValidAt(now: Date): boolean {
    if (this._expiresAt <= now) return false;
    return this._owner instanceof Barber ? this._owner.active : true;
  }
}
