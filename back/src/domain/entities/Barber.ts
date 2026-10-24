import { ensure } from "../errors/DomainError.js";
import { ErrorCode } from "../errors/ErrorCode.js";
import { normalizePhone } from "../value-objects/PhoneNumber.js";
import { Entity } from "./Entity.js";
import { WorkSchedule } from "./WorkSchedule.js";

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
    // La contraseña va antes del teléfono porque el set del teléfono revisa si tiene cuenta
    this._passwordHash = data.passwordHash;
    this.name = data.name;
    this.phone = data.phone;
    this._active = data.active;
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

  /** Se guarda como lo maneja WhatsApp, solo números y con indicativo. Vacío es que no tiene */
  set phone(value: string | null) {
    const phone = value === null ? "" : normalizePhone(value);
    ensure(phone === "" || phone.length >= 7, "El teléfono no es válido");
    ensure(phone !== "" || !this.hasAccount, "Con cuenta del panel el teléfono no puede quedar vacío, es con lo que entra");
    this._phone = phone === "" ? null : phone;
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

  /**
   * Cambia toda la semana de una vez. El día que no venga es que no trabaja.
   * En un mismo día puede haber varias jornadas pero no se pueden pisar
   */
  replaceSchedules(days: { weekday: number; startTime: string; endTime: string }[]): void {
    const schedules = days.map((d) => WorkSchedule.create({ barberId: this.id, ...d }));
    for (const a of schedules) {
      const clash = schedules.some(
        (b) => a !== b && a.weekday === b.weekday && a.startTime < b.endTime && b.startTime < a.endTime,
      );
      ensure(!clash, "Dos jornadas del mismo día se pisan", ErrorCode.ScheduleOverlap);
    }
    this._schedules.splice(0, this._schedules.length, ...schedules);
  }

  /** Le pone o le cambia la cuenta del panel */
  setAccount(phone: string, passwordHash: string, isAdmin: boolean): void {
    this._passwordHash = passwordHash;
    this.phone = phone;
    this._isAdmin = isAdmin;
  }
}
