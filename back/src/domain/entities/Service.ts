import { ensure } from "../errors/DomainError.js";
import type { Barber } from "./Barber.js";
import { Entity } from "./Entity.js";

export interface ServiceData {
  name: string;
  description: string;
  durationMin: number;
  /** En pesos, sin decimales */
  price: number;
  /** "/api/imagenes/<id>" cuando la subieron desde el panel */
  imageUrl: string | null;
  active: boolean;
  /** Null en los datos de ejemplo */
  createdBy: Barber | null;
  updatedBy: Barber | null;
  createdAt: Date;
  updatedAt: Date;
}

export type EditableServiceFields = Pick<ServiceData, "name" | "description" | "durationMin" | "price" | "imageUrl" | "active">;

/** Servicio del catálogo. No se borra porque las citas pasadas lo usan, se oculta. */
export class Service extends Entity {
  private _name!: string;
  private _description!: string;
  private _durationMin!: number;
  private _price!: number;
  private _imageUrl!: string | null;
  private _active: boolean;
  private readonly _createdBy: Barber | null;
  private _updatedBy: Barber | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(data: ServiceData, id?: number) {
    super(id);
    this.name = data.name;
    this.description = data.description;
    this.durationMin = data.durationMin;
    this.price = data.price;
    this.imageUrl = data.imageUrl;
    this._active = data.active;
    this._createdBy = data.createdBy;
    this._updatedBy = data.updatedBy;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  /** Servicio nuevo creado por el admin, queda guardado quién lo creó */
  static create(fields: EditableServiceFields, author: Barber, now = new Date()): Service {
    return new Service({ ...fields, createdBy: author, updatedBy: author, createdAt: now, updatedAt: now });
  }

  /** Para armarlo desde la base */
  static restore(id: number, data: ServiceData): Service {
    return new Service(data, id);
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    const name = value.trim();
    ensure(name.length > 0 && name.length <= 60, "El nombre del servicio no puede quedar vacío ni pasar de 60 letras");
    this._name = name;
  }

  get description(): string {
    return this._description;
  }

  set description(value: string) {
    const description = value.trim();
    ensure(description.length <= 300, "La descripción no puede pasar de 300 letras");
    this._description = description;
  }

  get durationMin(): number {
    return this._durationMin;
  }

  set durationMin(value: number) {
    ensure(Number.isInteger(value) && value >= 5 && value <= 480, "La duración va de 5 minutos a 8 horas");
    this._durationMin = value;
  }

  get price(): number {
    return this._price;
  }

  set price(value: number) {
    ensure(Number.isInteger(value) && value >= 0, "El precio tiene que ser en pesos y no puede ser negativo");
    this._price = value;
  }

  get imageUrl(): string | null {
    return this._imageUrl;
  }

  set imageUrl(value: string | null) {
    ensure(value === null || value.length <= 300, "La dirección de la imagen es muy larga");
    this._imageUrl = value;
  }

  /** Si se ve en la web y en WhatsApp */
  get active(): boolean {
    return this._active;
  }

  set active(value: boolean) {
    this._active = value;
  }

  get createdBy(): Barber | null {
    return this._createdBy;
  }

  get updatedBy(): Barber | null {
    return this._updatedBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  hide(): void {
    this._active = false;
  }

  show(): void {
    this._active = true;
  }

  /** Cambia lo que manden y deja guardado quién hizo el cambio */
  update(fields: Partial<EditableServiceFields>, author: Barber, now = new Date()): void {
    if (fields.name !== undefined) this.name = fields.name;
    if (fields.description !== undefined) this.description = fields.description;
    if (fields.durationMin !== undefined) this.durationMin = fields.durationMin;
    if (fields.price !== undefined) this.price = fields.price;
    if (fields.imageUrl !== undefined) this.imageUrl = fields.imageUrl;
    if (fields.active !== undefined) this.active = fields.active;
    this._updatedBy = author;
    this._updatedAt = now;
  }
}
