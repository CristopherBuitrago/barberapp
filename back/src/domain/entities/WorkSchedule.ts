import { ensure } from "../errors/DomainError.js";
import { Entity } from "./Entity.js";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Jornada de un barbero en un día de la semana (0 es domingo, 6 es sábado). */
export class WorkSchedule extends Entity {
  private _weekday!: number;
  private _startTime!: string;
  private _endTime!: string;

  private constructor(
    readonly barberId: number,
    weekday: number,
    startTime: string,
    endTime: string,
    id?: number,
  ) {
    super(id);
    this.weekday = weekday;
    this.setHours(startTime, endTime);
  }

  static create(data: { barberId: number; weekday: number; startTime: string; endTime: string }): WorkSchedule {
    return new WorkSchedule(data.barberId, data.weekday, data.startTime, data.endTime);
  }

  /** Para armarla desde la base */
  static restore(id: number, data: { barberId: number; weekday: number; startTime: string; endTime: string }): WorkSchedule {
    return new WorkSchedule(data.barberId, data.weekday, data.startTime, data.endTime, id);
  }

  get weekday(): number {
    return this._weekday;
  }

  set weekday(value: number) {
    ensure(Number.isInteger(value) && value >= 0 && value <= 6, "El día de la semana va de 0 (domingo) a 6 (sábado)");
    this._weekday = value;
  }

  /** Hora local en que empieza, por ejemplo "09:00" */
  get startTime(): string {
    return this._startTime;
  }

  set startTime(value: string) {
    this.setHours(value, this._endTime);
  }

  get endTime(): string {
    return this._endTime;
  }

  set endTime(value: string) {
    this.setHours(this._startTime, value);
  }

  /** Las dos horas juntas, porque la de inicio tiene que ir antes que la de fin */
  setHours(startTime: string, endTime: string): void {
    ensure(TIME.test(startTime) && TIME.test(endTime), "Las horas van en formato HH:MM");
    ensure(startTime < endTime, "La jornada tiene que empezar antes de terminar");
    this._startTime = startTime;
    this._endTime = endTime;
  }
}
