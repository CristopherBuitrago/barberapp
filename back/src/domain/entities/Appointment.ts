import { ErrorCode } from "../errors/ErrorCode.js";
import { ConflictError, ensure } from "../errors/DomainError.js";
import { addMinutes } from "../value-objects/TimeZone.js";
import type { Barber } from "./Barber.js";
import type { Client } from "./Client.js";
import { Entity } from "./Entity.js";
import type { Service } from "./Service.js";

/** Los valores son los que ya guarda la base y recibe el front, por eso siguen en español. */
export const AppointmentStatus = {
  Scheduled: "AGENDADA",
  Cancelled: "CANCELADA",
  Completed: "COMPLETADA",
  NoShow: "NO_ASISTIO",
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const BookingChannel = {
  Web: "WEB",
  WhatsApp: "WHATSAPP",
  Panel: "PANEL",
} as const;
export type BookingChannel = (typeof BookingChannel)[keyof typeof BookingChannel];

const STATUSES: readonly string[] = Object.values(AppointmentStatus);

export interface AppointmentData {
  client: Client;
  barber: Barber;
  service: Service;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  channel: BookingChannel;
  /** Precio del servicio cuando se agendó, así un cambio de precio no toca citas viejas */
  price: number;
  discountPct: number;
  notes: string;
  createdAt: Date;
}

/** Una cita: quién viene, con quién, a qué y cuándo. */
export class Appointment extends Entity {
  private readonly _client: Client;
  private readonly _barber: Barber;
  private readonly _service: Service;
  private _start: Date;
  private _end: Date;
  private _status!: AppointmentStatus;
  private readonly _channel: BookingChannel;
  private readonly _price: number;
  private readonly _discountPct: number;
  private _notes!: string;
  private readonly _createdAt: Date;

  private constructor(data: AppointmentData, id?: number) {
    super(id);
    ensure(data.start < data.end, "La cita tiene que empezar antes de terminar", ErrorCode.InvalidTimeRange);
    ensure(data.discountPct >= 0 && data.discountPct <= 100, "El descuento va de 0 a 100");
    this._client = data.client;
    this._barber = data.barber;
    this._service = data.service;
    this._start = data.start;
    this._end = data.end;
    this.status = data.status;
    this._channel = data.channel;
    this._price = data.price;
    this._discountPct = data.discountPct;
    this.notes = data.notes;
    this._createdAt = data.createdAt;
  }

  /** Cita nueva. El fin y el precio salen del servicio */
  static schedule(
    data: {
      client: Client;
      barber: Barber;
      service: Service;
      start: Date;
      channel: BookingChannel;
      discountPct?: number;
      notes?: string;
    },
    now = new Date(),
  ): Appointment {
    return new Appointment({
      client: data.client,
      barber: data.barber,
      service: data.service,
      start: data.start,
      end: addMinutes(data.start, data.service.durationMin),
      status: AppointmentStatus.Scheduled,
      channel: data.channel,
      price: data.service.price,
      discountPct: data.discountPct ?? 0,
      notes: data.notes ?? "",
      createdAt: now,
    });
  }

  /** Para armarla desde la base */
  static restore(id: number, data: AppointmentData): Appointment {
    return new Appointment(data, id);
  }

  get client(): Client {
    return this._client;
  }

  get barber(): Barber {
    return this._barber;
  }

  get service(): Service {
    return this._service;
  }

  get start(): Date {
    return this._start;
  }

  get end(): Date {
    return this._end;
  }

  get status(): AppointmentStatus {
    return this._status;
  }

  /** Desde el panel se puede poner cualquier estado, por ejemplo marcarla como completada */
  set status(value: AppointmentStatus) {
    ensure(STATUSES.includes(value), `Estado de cita inválido: ${value}`);
    this._status = value;
  }

  get channel(): BookingChannel {
    return this._channel;
  }

  get price(): number {
    return this._price;
  }

  get discountPct(): number {
    return this._discountPct;
  }

  /** Lo que paga con el descuento, redondeado a pesos */
  get finalPrice(): number {
    return Math.round((this._price * (100 - this._discountPct)) / 100);
  }

  get notes(): string {
    return this._notes;
  }

  set notes(value: string) {
    ensure(value.length <= 300, "Las notas no pueden pasar de 300 letras");
    this._notes = value;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get isScheduled(): boolean {
    return this._status === AppointmentStatus.Scheduled;
  }

  /** Agendada y todavía no ha terminado */
  isActiveAt(now: Date): boolean {
    return this.isScheduled && this._end > now;
  }

  /** Si la cita es del dueño de ese teléfono (ya normalizado) */
  belongsToPhone(phone: string): boolean {
    return this._client.phone === phone;
  }

  /** El cliente cancela. Solo se puede si sigue agendada */
  cancel(): void {
    if (!this.isScheduled) throw new ConflictError("La cita ya no está activa", ErrorCode.AppointmentNotActive);
    this._status = AppointmentStatus.Cancelled;
  }

  /** Cambia la hora con el mismo barbero y servicio. El fin se corre igual */
  reschedule(start: Date): void {
    if (!this.isScheduled) throw new ConflictError("La cita ya no está activa", ErrorCode.AppointmentNotActive);
    this._start = start;
    this._end = addMinutes(start, this._service.durationMin);
  }
}
