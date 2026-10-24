import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Appointment, BookingChannel } from "../../src/domain/entities/Appointment.js";
import { Barber } from "../../src/domain/entities/Barber.js";
import { Client } from "../../src/domain/entities/Client.js";
import { Image } from "../../src/domain/entities/Image.js";
import { Service } from "../../src/domain/entities/Service.js";
import { Session } from "../../src/domain/entities/Session.js";
import { TimeBlock } from "../../src/domain/entities/TimeBlock.js";
import { WorkSchedule } from "../../src/domain/entities/WorkSchedule.js";
import { ConflictError, RuleViolationError } from "../../src/domain/errors/DomainError.js";
import { findFreeSlots, fitsInSchedule } from "../../src/domain/services/availability.js";
import { normalizePhone } from "../../src/domain/value-objects/PhoneNumber.js";
import { TimeZone, addDays } from "../../src/domain/value-objects/TimeZone.js";

const tz = new TimeZone("-05:00");
const DAY = "2026-10-26"; // lunes
const at = (time: string) => tz.toInstant(DAY, time);

function barber(id: number, name: string, hours: [string, string] = ["09:00", "18:00"]): Barber {
  return Barber.restore(id, {
    name,
    phone: null,
    active: true,
    passwordHash: null,
    isAdmin: false,
    schedules: [WorkSchedule.restore(id * 10, { barberId: id, weekday: 1, startTime: hours[0], endTime: hours[1] })],
  });
}

const haircut = () =>
  Service.restore(1, {
    name: "Corte",
    description: "",
    durationMin: 30,
    price: 20000,
    imageUrl: null,
    active: true,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  });

const laura = () => Client.create({ name: "Laura", phone: "3101234567", acceptsDataPolicy: true });

describe("teléfonos y zona horaria", () => {
  it("a un celular colombiano de 10 dígitos le pone el 57 y deja igual los demás", () => {
    assert.equal(normalizePhone("+57 300-123-4567"), "573001234567");
    assert.equal(normalizePhone("300 123 4567"), "573001234567");
    assert.equal(normalizePhone("6012345678"), "6012345678");
  });

  it("a las 9 de la noche en Colombia ya es otro día en UTC, pero la fecha local sigue siendo la misma", () => {
    const night = at("21:00");
    assert.equal(night.toISOString().slice(0, 10), "2026-10-27");
    assert.equal(tz.localDate(night), DAY);
    assert.equal(tz.toLocalIso(at("09:30")), "2026-10-26T09:30:00-05:00");
    assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  });
});

describe("Entity", () => {
  it("una entidad nueva no tiene id hasta que se guarda", () => {
    const client = laura();
    assert.equal(client.isNew, true);
    assert.throws(() => client.id, /todavía no se ha guardado/);
  });

  it("dos entidades son la misma si son del mismo tipo y tienen el mismo id", () => {
    assert.ok(barber(1, "Diego").equals(barber(1, "Diego Otra Vez")));
    assert.ok(!barber(1, "Diego").equals(barber(2, "Andrés")));
    assert.ok(!laura().equals(laura()));
  });
});

describe("Barber", () => {
  it("los set validan el nombre y normalizan el teléfono", () => {
    const diego = Barber.create({ name: "  Diego  " });
    assert.equal(diego.name, "Diego");
    diego.phone = "300 123 4567";
    assert.equal(diego.phone, "573001234567");
    assert.throws(() => (diego.name = "   "), RuleViolationError);
  });

  it("el rol sale de si es admin, y la cuenta se pone de una vez", () => {
    const diego = barber(1, "Diego");
    assert.equal(diego.role, "BARBERO");
    assert.equal(diego.hasAccount, false);
    diego.setAccount("3001234567", "hash", true);
    assert.equal(diego.role, "ADMIN");
    assert.equal(diego.hasAccount, true);
  });

  it("tiene sus jornadas, y no se le puede agregar una de otro barbero", () => {
    const diego = barber(1, "Diego");
    assert.equal(diego.schedulesOn(1).length, 1);
    assert.equal(diego.schedulesOn(0).length, 0);
    const other = WorkSchedule.create({ barberId: 2, weekday: 2, startTime: "09:00", endTime: "12:00" });
    assert.throws(() => diego.addSchedule(other), RuleViolationError);
  });
});

describe("WorkSchedule", () => {
  it("valida el día y que la jornada empiece antes de terminar", () => {
    const s = WorkSchedule.create({ barberId: 1, weekday: 1, startTime: "09:00", endTime: "18:00" });
    assert.throws(() => (s.weekday = 7), RuleViolationError);
    assert.throws(() => (s.endTime = "08:00"), RuleViolationError);
    assert.throws(() => (s.startTime = "9am"), RuleViolationError);
    s.setHours("10:00", "14:00");
    assert.deepEqual([s.startTime, s.endTime], ["10:00", "14:00"]);
  });
});

describe("Client", () => {
  it("el teléfono se guarda normalizado y no tiene set", () => {
    const client = laura();
    assert.equal(client.phone, "573101234567");
    assert.equal(Object.getOwnPropertyDescriptor(Client.prototype, "phone")?.set, undefined);
  });

  it("la autorización de datos se puede dar pero no quitar", () => {
    const client = Client.create({ name: "Ana", phone: "3102220000" });
    client.acceptsDataPolicy = true;
    assert.throws(() => (client.acceptsDataPolicy = false), RuleViolationError);
  });

  it("no acepta fecha de nacimiento en el futuro", () => {
    assert.throws(() => (laura().birthDate = new Date(Date.now() + 86400_000)), RuleViolationError);
  });

  it("al registrarse queda con cuenta y el descuento de bienvenida se usa una sola vez", () => {
    const client = laura();
    assert.equal(client.useWelcomeDiscount(10), 0);
    client.register({ name: "Laura M", passwordHash: "hash", birthDate: null });
    assert.equal(client.hasAccount, true);
    assert.equal(client.hasPendingWelcomeDiscount, true);
    assert.equal(client.useWelcomeDiscount(10), 10);
    assert.equal(client.useWelcomeDiscount(10), 0);
  });
});

describe("Service", () => {
  it("los set no dejan precios negativos, duraciones raras ni nombres vacíos", () => {
    const service = haircut();
    assert.throws(() => (service.price = -1), RuleViolationError);
    assert.throws(() => (service.price = 1000.5), RuleViolationError);
    assert.throws(() => (service.durationMin = 2), RuleViolationError);
    assert.throws(() => (service.name = ""), RuleViolationError);
    service.price = 22000;
    assert.equal(service.price, 22000);
  });

  it("guarda quién lo creó y quién lo cambió de último", () => {
    const diego = barber(1, "Diego");
    const andres = barber(2, "Andrés");
    const service = Service.create(
      { name: "Cejas", description: "", durationMin: 15, price: 8000, imageUrl: null, active: true },
      diego,
    );
    assert.equal(service.createdBy, diego);
    service.update({ price: 9000 }, andres);
    assert.equal(service.createdBy, diego);
    assert.equal(service.updatedBy, andres);
    assert.equal(service.price, 9000);
    service.hide();
    assert.equal(service.active, false);
  });
});

describe("Appointment", () => {
  const schedule = (discountPct = 0) =>
    Appointment.schedule({
      client: laura(),
      barber: barber(1, "Diego"),
      service: haircut(),
      start: at("10:00"),
      channel: BookingChannel.Web,
      discountPct,
    });

  it("tiene su cliente, su barbero y su servicio, y el fin y el precio salen del servicio", () => {
    const appointment = schedule();
    assert.equal(appointment.client.name, "Laura");
    assert.equal(appointment.barber.name, "Diego");
    assert.equal(appointment.service.name, "Corte");
    assert.equal(appointment.end.getTime(), at("10:30").getTime());
    assert.equal(appointment.price, 20000);
    assert.equal(appointment.status, "AGENDADA");
  });

  it("calcula el precio final con el descuento, redondeado a pesos", () => {
    assert.equal(schedule(10).finalPrice, 18000);
    assert.equal(schedule(15).finalPrice, 17000);
  });

  it("se cancela una vez, y cancelada ya no se reprograma", () => {
    const appointment = schedule();
    appointment.cancel();
    assert.equal(appointment.status, "CANCELADA");
    assert.throws(() => appointment.cancel(), ConflictError);
    assert.throws(() => appointment.reschedule(at("11:00")), ConflictError);
  });

  it("al reprogramar el fin se corre igual", () => {
    const appointment = schedule();
    appointment.reschedule(at("15:15"));
    assert.equal(appointment.end.getTime(), at("15:45").getTime());
  });

  it("el set de estado no acepta valores inventados y las notas tienen límite", () => {
    const appointment = schedule();
    appointment.status = "COMPLETADA";
    assert.equal(appointment.status, "COMPLETADA");
    assert.throws(() => (appointment.status = "OTRO" as never), RuleViolationError);
    assert.throws(() => (appointment.notes = "x".repeat(301)), RuleViolationError);
  });

  it("sabe si sigue activa y de qué teléfono es", () => {
    const appointment = schedule();
    assert.ok(appointment.isActiveAt(at("10:15")));
    assert.ok(!appointment.isActiveAt(at("10:30")));
    assert.ok(appointment.belongsToPhone("573101234567"));
  });
});

describe("TimeBlock, Session e Image", () => {
  it("un bloqueo tiene su barbero y el fin va después del inicio", () => {
    const diego = barber(1, "Diego");
    const block = TimeBlock.create({ barber: diego, start: at("12:00"), end: at("13:00") });
    assert.equal(block.barber, diego);
    assert.throws(() => (block.end = at("11:00")), RuleViolationError);
    assert.throws(() => TimeBlock.create({ barber: diego, start: at("12:00"), end: at("12:00") }), RuleViolationError);
  });

  it("la sesión sabe de quién es, y un barbero desactivado ya no la puede usar", () => {
    const diego = barber(1, "Diego");
    const session = new Session(diego, at("20:00"));
    assert.equal(session.role, "BARBERO");
    assert.equal(session.barber, diego);
    assert.equal(session.client, null);
    assert.deepEqual(Session.claimsOf(diego), { ownerKind: "barber", ownerId: 1 });
    assert.ok(session.ownerCanUseIt);
    diego.active = false;
    assert.ok(!session.ownerCanUseIt);
    assert.equal(new Session(laura(), at("20:00")).role, "CLIENTE");
  });

  it("solo se suben imágenes JPG, PNG o WebP", () => {
    assert.throws(() => Image.upload("text/plain", new Uint8Array([1])), RuleViolationError);
    assert.throws(() => Image.upload("image/png", new Uint8Array()), RuleViolationError);
    assert.equal(Image.restore(7, { type: "image/png", data: new Uint8Array([1]), createdAt: new Date() }).url, "/api/imagenes/7");
  });
});

describe("horas libres", () => {
  const base = { date: DAY, intervalMin: 30, earliestStart: new Date(0), timeZone: tz };

  it("recorre la jornada y el servicio tiene que caber antes de que se acabe", () => {
    const slots = findFreeSlots({ ...base, durationMin: 60, barbers: [{ barber: barber(1, "Diego", ["09:00", "11:00"]), busy: [] }] });
    assert.deepEqual(slots.map((s) => tz.toLocalIso(s.start).slice(11, 16)), ["09:00", "09:30", "10:00"]);
  });

  it("salta lo ocupado y junta los barberos que pueden a cada hora", () => {
    const slots = findFreeSlots({
      ...base,
      durationMin: 30,
      barbers: [
        { barber: barber(1, "Diego", ["09:00", "10:30"]), busy: [{ start: at("09:30"), end: at("10:00") }] },
        { barber: barber(2, "Andrés", ["09:30", "10:30"]), busy: [] },
      ],
    });
    assert.deepEqual(
      slots.map((s) => [tz.toLocalIso(s.start).slice(11, 16), s.barbers.map((b) => b.name)]),
      [
        ["09:00", ["Diego"]],
        ["09:30", ["Andrés"]],
        ["10:00", ["Diego", "Andrés"]],
      ],
    );
  });

  it("dice si una cita cabe completa en la jornada", () => {
    const schedules = barber(1, "Diego", ["09:00", "12:00"]).schedules;
    assert.ok(fitsInSchedule(schedules, DAY, tz, at("11:30"), at("12:00")));
    assert.ok(!fitsInSchedule(schedules, DAY, tz, at("11:45"), at("12:15")));
  });
});
