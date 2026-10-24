import { ensure } from "../errors/DomainError.js";
import { normalizePhone } from "../value-objects/PhoneNumber.js";
import { Entity } from "./Entity.js";
import type { WorkSchedule } from "./WorkSchedule.js";

export interface BarberData {
  name: string;
  /** WhatsApp con indicativo y sin "+", por ejemplo 573001234567 */
  phone: string | null;
  active: boolean;
  passwordHash: string | null;
  isAdmin: boolean;
  schedules: WorkSchedule[];
}

/** Alguien del equipo de la barbería. Si tiene contraseña puede entrar al panel. */
export class Barber extends Entity {
  private _name!: string;
  private _phone: string | null = null;
  private _active: boolean;
  private _passwordHash: string | null;
  private _isAdmin: boolean;
  private readonly _schedules: WorkSchedule[];

  private constructor(data: BarberData, id?: number) {
    super(id);
    this.name = data.name;
    this.phone = data.phone;
    this._active = data.active;
    this._passwordHash = data.passwordHash;
    this._isAdmin = data.isAdmin;
    this._schedules = [...data.schedules];
  }

  static create(data: { name: string; phone?: string | null }): Barber {
    return new Barber({ name: data.name, phone: data.phone ?? null, active: true, passwordHash: null, isAdmin: false, schedules: [] });
  }

  /** Para armarlo desde la base */
  static restore(id: number, data: BarberData): Barber {
    return new Barber(data, id);
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    const name = value.trim();
    ensure(name.length > 0 && name.length <= 80, "El nombre no puede quedar vacío ni pasar de 80 letras");
    this._name = name;
  }

  get phone(): string | null {
    return this._phone;
  }

  /** Se guarda como lo maneja WhatsApp, solo números y con indicativo */
  set phone(value: string | null) {
    this._phone = value === null ? null : normalizePhone(value);
  }

  get active(): boolean {
    return this._active;
  }

  set active(value: boolean) {
    this._active = value;
  }

  get passwordHash(): string | null {
    return this._passwordHash;
  }

  set passwordHash(value: string | null) {
    this._passwordHash = value;
  }

  get isAdmin(): boolean {
    return this._isAdmin;
  }

  set isAdmin(value: boolean) {
    this._isAdmin = value;
  }

  /** Para el panel y el agente, el rol sale de si es admin o no */
  get role(): "BARBERO" | "ADMIN" {
    return this._isAdmin ? "ADMIN" : "BARBERO";
  }

  /** Si puede entrar al panel */
  get hasAccount(): boolean {
    return this._passwordHash !== null;
  }

  /** Sus jornadas. Es de solo lectura, para agregar se usa addSchedule */
  get schedules(): readonly WorkSchedule[] {
    return this._schedules;
  }

  addSchedule(schedule: WorkSchedule): void {
    ensure(schedule.barberId === this.id, "Esa jornada es de otro barbero");
    this._schedules.push(schedule);
  }

  schedulesOn(weekday: number): WorkSchedule[] {
    return this._schedules.filter((s) => s.weekday === weekday);
  }

  /** Le pone o le cambia la cuenta del panel */
  setAccount(phone: string, passwordHash: string, isAdmin: boolean): void {
    this.phone = phone;
    this._passwordHash = passwordHash;
    this._isAdmin = isAdmin;
  }
}
