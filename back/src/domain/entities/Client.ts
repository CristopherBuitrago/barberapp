import { ensure } from "../errors/DomainError.js";
import { normalizePhone } from "../value-objects/PhoneNumber.js";
import { Entity } from "./Entity.js";

export interface ClientData {
  name: string;
  phone: string;
  birthDate: Date | null;
  /** Si creó cuenta en la web */
  registered: boolean;
  /** Si aceptó el tratamiento de datos (Ley 1581) */
  acceptsDataPolicy: boolean;
  welcomeDiscountUsed: boolean;
  /** Null si solo ha reservado sin cuenta */
  passwordHash: string | null;
  createdAt: Date;
}

/** Cliente de la barbería. Se crea la primera vez que reserva, tenga cuenta o no. */
export class Client extends Entity {
  private _name!: string;
  private readonly _phone: string;
  private _birthDate: Date | null;
  private _registered: boolean;
  private _acceptsDataPolicy: boolean;
  private _welcomeDiscountUsed: boolean;
  private _passwordHash: string | null;
  private readonly _createdAt: Date;

  private constructor(data: ClientData, id?: number) {
    super(id);
    this.name = data.name;
    this._phone = normalizePhone(data.phone);
    ensure(this._phone.length >= 7, "El teléfono no es válido");
    this._birthDate = data.birthDate;
    this._registered = data.registered;
    this._acceptsDataPolicy = data.acceptsDataPolicy;
    this._welcomeDiscountUsed = data.welcomeDiscountUsed;
    this._passwordHash = data.passwordHash;
    this._createdAt = data.createdAt;
  }

  /** El cliente que aparece la primera vez que alguien reserva con ese teléfono */
  static create(data: { name: string; phone: string; acceptsDataPolicy?: boolean }, now = new Date()): Client {
    return new Client({
      name: data.name,
      phone: data.phone,
      birthDate: null,
      registered: false,
      acceptsDataPolicy: data.acceptsDataPolicy ?? false,
      welcomeDiscountUsed: false,
      passwordHash: null,
      createdAt: now,
    });
  }

  /** Para armarlo desde la base */
  static restore(id: number, data: ClientData): Client {
    return new Client(data, id);
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    const name = value.trim();
    ensure(name.length > 0 && name.length <= 80, "El nombre no puede quedar vacío ni pasar de 80 letras");
    this._name = name;
  }

  /** No tiene set porque es con lo que inicia sesión y como lo reconoce WhatsApp */
  get phone(): string {
    return this._phone;
  }

  get birthDate(): Date | null {
    return this._birthDate;
  }

  set birthDate(value: Date | null) {
    ensure(value === null || value < new Date(), "La fecha de nacimiento no puede ser en el futuro");
    this._birthDate = value;
  }

  get registered(): boolean {
    return this._registered;
  }

  get acceptsDataPolicy(): boolean {
    return this._acceptsDataPolicy;
  }

  /** La autorización se puede dar, pero no se quita por aquí */
  set acceptsDataPolicy(value: boolean) {
    ensure(value || !this._acceptsDataPolicy, "La autorización de datos no se puede quitar desde aquí");
    this._acceptsDataPolicy = value;
  }

  get welcomeDiscountUsed(): boolean {
    return this._welcomeDiscountUsed;
  }

  get passwordHash(): string | null {
    return this._passwordHash;
  }

  set passwordHash(value: string | null) {
    this._passwordHash = value;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /** Si ya tiene cuenta para entrar a la web */
  get hasAccount(): boolean {
    return this._passwordHash !== null;
  }

  /** El descuento de bienvenida es una sola vez, en la primera cita después de registrarse */
  get hasPendingWelcomeDiscount(): boolean {
    return this._registered && !this._welcomeDiscountUsed;
  }

  /** Crea la cuenta. Si ya había reservado sin cuenta, todo queda en esta misma ficha */
  register(data: { name: string; passwordHash: string; birthDate: Date | null }): void {
    this.name = data.name;
    this.birthDate = data.birthDate;
    this._passwordHash = data.passwordHash;
    this._registered = true;
    this._acceptsDataPolicy = true;
  }

  /** Gasta el descuento de bienvenida y devuelve el porcentaje que le toca, o 0 si ya no tiene */
  useWelcomeDiscount(pct: number): number {
    if (!this.hasPendingWelcomeDiscount) return 0;
    this._welcomeDiscountUsed = true;
    return pct;
  }
}
