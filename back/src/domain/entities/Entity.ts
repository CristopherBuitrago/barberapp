/**
 * Lo que tienen todas las entidades: un id que pone la base cuando se guardan por
 * primera vez. Mientras no se haya guardado, la entidad es nueva y no tiene id.
 */
export abstract class Entity {
  protected constructor(private readonly _id?: number) {}

  get id(): number {
    if (this._id === undefined) throw new Error(`${this.constructor.name} todavía no se ha guardado, no tiene id`);
    return this._id;
  }

  /** Si todavía no está en la base */
  get isNew(): boolean {
    return this._id === undefined;
  }

  /** Dos entidades son la misma si son del mismo tipo y tienen el mismo id */
  equals(other: Entity | null | undefined): boolean {
    if (!other || this.isNew || other.isNew) return false;
    return this.constructor === other.constructor && this.id === other.id;
  }
}
