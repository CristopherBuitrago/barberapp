import { ensure } from "../errors/DomainError.js";
import type { Barber } from "./Barber.js";
import { Entity } from "./Entity.js";

export interface TimeBlockData {
  barber: Barber;
  start: Date;
  end: Date;
  reason: string;
}

/** Rato en que un barbero no atiende: almuerzo, una diligencia, un día libre. */
export class TimeBlock extends Entity {
  private readonly _barber: Barber;
  private _start!: Date;
  private _end!: Date;
  private _reason!: string;

  private constructor(data: TimeBlockData, id?: number) {
    super(id);
    this._barber = data.barber;
    this.setPeriod(data.start, data.end);
    this.reason = data.reason;
  }

  static create(data: { barber: Barber; start: Date; end: Date; reason?: string }): TimeBlock {
    return new TimeBlock({ ...data, reason: data.reason ?? "" });
  }

  /** Para armarlo desde la base */
  static restore(id: number, data: TimeBlockData): TimeBlock {
    return new TimeBlock(data, id);
  }

  get barber(): Barber {
    return this._barber;
  }

  get start(): Date {
    return this._start;
  }

  set start(value: Date) {
    this.setPeriod(value, this._end);
  }

  get end(): Date {
    return this._end;
  }

  set end(value: Date) {
    this.setPeriod(this._start, value);
  }

  get reason(): string {
    return this._reason;
  }

  set reason(value: string) {
    ensure(value.length <= 120, "El motivo no puede pasar de 120 letras");
    this._reason = value;
  }

  /** Inicio y fin juntos, porque el fin tiene que ir después del inicio */
  setPeriod(start: Date, end: Date): void {
    ensure(end > start, "El fin debe ser después del inicio");
    this._start = start;
    this._end = end;
  }
}
