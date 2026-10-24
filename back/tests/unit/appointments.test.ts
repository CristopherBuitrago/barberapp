import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CancelAppointment } from "../../src/application/use-cases/appointments/CancelAppointment.js";
import { CreateAppointment } from "../../src/application/use-cases/appointments/CreateAppointment.js";
import { RescheduleAppointment } from "../../src/application/use-cases/appointments/RescheduleAppointment.js";
import { GetAvailability } from "../../src/application/use-cases/availability/GetAvailability.js";
import { BookingChannel, type BookingChannel as Channel } from "../../src/domain/entities/Appointment.js";
import type { Barber } from "../../src/domain/entities/Barber.js";
import type { Service } from "../../src/domain/entities/Service.js";
import { ConflictError, NotFoundError, RuleViolationError } from "../../src/domain/errors/DomainError.js";
import { TimeZone } from "../../src/domain/value-objects/TimeZone.js";
import { FixedClock, memoryRepositories } from "./fakes.js";

const tz = new TimeZone("-05:00");
const DAY = "2026-10-26";
const at = (time: string) => tz.toInstant(DAY, time);

let repos: ReturnType<typeof memoryRepositories>;
let clock: FixedClock;
let create: CreateAppointment;
let diego: Barber;
let andres: Barber;
let haircut: Service;

beforeEach(() => {
  repos = memoryRepositories();
  clock = new FixedClock(at("08:00"));
  diego = repos.store.addBarber({ name: "Diego" }, { startTime: "09:00", endTime: "18:00" });
  andres = repos.store.addBarber({ name: "Andrés" }, { startTime: "09:00", endTime: "18:00" });
  haircut = repos.store.addService({ name: "Corte", durationMin: 30, price: 20000 });
  create = new CreateAppointment(repos.services, repos.transactions, clock, tz, 10);
});

function book(overrides: Partial<Parameters<CreateAppointment["execute"]>[0]> = {}) {
  return create.execute({
    serviceId: haircut.id,
    barberId: diego.id,
    start: at("10:00"),
    client: { name: "Laura", phone: "3101234567", acceptsDataPolicy: true },
    channel: BookingChannel.Web as Channel,
    ...overrides,
  });
}

describe("agendar cita", () => {
  it("guarda la cita con el precio del servicio y el teléfono normalizado", async () => {
    const appointment = await book();
    assert.equal(appointment.client.phone, "573101234567");
    assert.equal(appointment.price, 20000);
    assert.equal(appointment.discountPct, 0);
    assert.equal(appointment.end.getTime(), at("10:30").getTime());
  });

  it("en la web pide aceptar los datos, por WhatsApp no", async () => {
    const noConsent = { name: "X", phone: "3100000000", acceptsDataPolicy: false };
    await assert.rejects(book({ client: noConsent }), RuleViolationError);
    const viaWhatsApp = await book({ client: noConsent, channel: BookingChannel.WhatsApp });
    assert.equal(viaWhatsApp.channel, "WHATSAPP");
  });

  it("con sesión de cliente usa los datos de la cuenta y no los del formulario", async () => {
    const account = repos.store.addClient({ name: "Sofía", phone: "573209998888", registered: true, acceptsDataPolicy: true });
    const appointment = await book({
      client: { name: "Otro nombre", phone: "3000000000", acceptsDataPolicy: false },
      sessionClient: account,
    });
    assert.equal(appointment.client.id, account.id);
    assert.equal(appointment.client.name, "Sofía");
  });

  it("no deja reservar en el pasado ni un servicio oculto", async () => {
    clock.current = at("11:00");
    await assert.rejects(book(), RuleViolationError);
    const hidden = repos.store.addService({ name: "Oculto", durationMin: 30, price: 1, active: false });
    await assert.rejects(book({ serviceId: hidden.id, start: at("12:00") }), NotFoundError);
  });

  it("no deja dos citas a la misma hora con el mismo barbero", async () => {
    await book();
    await assert.rejects(
      book({ client: { name: "Pedro", phone: "3105550000", acceptsDataPolicy: true } }),
      new ConflictError("Esa hora ya no está disponible con ese barbero"),
    );
  });

  it("respeta los bloqueos y la jornada", async () => {
    await repos.timeBlocks.create({ barberId: diego.id, start: at("10:00"), end: at("11:00"), reason: "Almuerzo" });
    await assert.rejects(book(), ConflictError);
    await assert.rejects(book({ start: at("17:45") }), ConflictError);
  });

  it("sin barbero elegido le asigna el primero libre", async () => {
    await book();
    const second = await book({ barberId: undefined, client: { name: "Pedro", phone: "3105550000", acceptsDataPolicy: true } });
    assert.equal(second.barber.id, andres.id);
    await assert.rejects(
      book({ barberId: undefined, client: { name: "Ana", phone: "3102220000", acceptsDataPolicy: true } }),
      new ConflictError("Esa hora ya no está disponible"),
    );
  });

  it("un cliente tiene una sola cita activa, salvo desde el panel", async () => {
    await book();
    await assert.rejects(book({ start: at("15:00") }), ConflictError);
    const fromPanel = await book({ start: at("15:00"), channel: BookingChannel.Panel });
    assert.equal(fromPanel.channel, "PANEL");
  });

  it("el descuento de bienvenida se usa una sola vez", async () => {
    repos.store.addClient({ name: "Nuevo", phone: "573157778888", registered: true });
    const client = { name: "Nuevo", phone: "3157778888", acceptsDataPolicy: true };
    const first = await book({ client, channel: BookingChannel.Panel });
    const second = await book({ client, start: at("12:00"), channel: BookingChannel.Panel });
    assert.equal(first.discountPct, 10);
    assert.equal(second.discountPct, 0);
  });
});

describe("cancelar y reprogramar", () => {
  it("solo el dueño puede cancelar, y una vez", async () => {
    const appointment = await book();
    const cancel = new CancelAppointment(repos.appointments);
    await assert.rejects(cancel.execute({ appointmentId: appointment.id, phone: "3000000000" }), NotFoundError);
    const cancelled = await cancel.execute({ appointmentId: appointment.id, phone: "3101234567" });
    assert.equal(cancelled.status, "CANCELADA");
    await assert.rejects(cancel.execute({ appointmentId: appointment.id, phone: "3101234567" }), ConflictError);
  });

  it("reprograma dentro de su mismo espacio porque la cita no choca consigo misma", async () => {
    const appointment = await book();
    const reschedule = new RescheduleAppointment(repos.appointments, repos.transactions, clock, tz);
    const moved = await reschedule.execute({ appointmentId: appointment.id, phone: "3101234567", start: at("10:15") });
    assert.equal(moved.start.getTime(), at("10:15").getTime());
    assert.equal(moved.end.getTime(), at("10:45").getTime());
  });

  it("no reprograma a una hora ocupada", async () => {
    const appointment = await book();
    await book({ start: at("12:00"), client: { name: "Ana", phone: "3102220000", acceptsDataPolicy: true } });
    const reschedule = new RescheduleAppointment(repos.appointments, repos.transactions, clock, tz);
    await assert.rejects(
      reschedule.execute({ appointmentId: appointment.id, phone: "3101234567", start: at("12:00") }),
      ConflictError,
    );
  });
});

describe("disponibilidad", () => {
  function availability() {
    return new GetAvailability(
      repos.services,
      repos.barbers,
      repos.schedules,
      repos.timeBlocks,
      repos.appointments,
      clock,
      tz,
      30,
    );
  }

  it("no ofrece horas dentro de los próximos 15 minutos", async () => {
    clock.current = at("09:50");
    const slots = await availability().execute({ serviceId: haircut.id, date: DAY, barberId: diego.id });
    assert.equal(tz.toLocalIso(slots[0].start).slice(11, 16), "10:30");
  });

  it("una cita agendada le quita esa hora solo al barbero que la tiene", async () => {
    await book();
    const slots = await availability().execute({ serviceId: haircut.id, date: DAY });
    const tenAm = slots.find((s) => s.start.getTime() === at("10:00").getTime());
    assert.deepEqual(tenAm?.barbers, [{ id: andres.id, name: "Andrés" }]);
  });

  it("los barberos inactivos no aparecen", async () => {
    andres.active = false;
    const slots = await availability().execute({ serviceId: haircut.id, date: DAY });
    assert.ok(slots.every((s) => s.barbers.length === 1 && s.barbers[0].id === diego.id));
  });
});
