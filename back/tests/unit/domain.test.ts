import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { finalPrice } from "../../src/domain/entities/Appointment.js";
import { findFreeSlots, fitsInSchedule } from "../../src/domain/services/availability.js";
import { normalizePhone } from "../../src/domain/value-objects/PhoneNumber.js";
import { TimeZone, addDays } from "../../src/domain/value-objects/TimeZone.js";

const tz = new TimeZone("-05:00");
const schedule = (barberId: number, startTime: string, endTime: string) => ({
  id: barberId,
  barberId,
  weekday: 1,
  startTime,
  endTime,
});

describe("teléfonos", () => {
  it("a un celular colombiano de 10 dígitos le pone el 57", () => {
    assert.equal(normalizePhone("300 123 4567"), "573001234567");
    assert.equal(normalizePhone("+57 300-123-4567"), "573001234567");
  });

  it("deja igual los que ya traen indicativo o no son celulares", () => {
    assert.equal(normalizePhone("573001234567"), "573001234567");
    assert.equal(normalizePhone("6012345678"), "6012345678");
  });
});

describe("zona horaria", () => {
  it("convierte entre hora local y el instante real", () => {
    const instant = tz.toInstant("2026-10-26", "09:30");
    assert.equal(instant.toISOString(), "2026-10-26T14:30:00.000Z");
    assert.equal(tz.toLocalIso(instant), "2026-10-26T09:30:00-05:00");
  });

  it("a las 9 de la noche en Colombia ya es otro día en UTC, pero la fecha local sigue siendo la misma", () => {
    const night = tz.toInstant("2026-10-26", "21:00");
    assert.equal(night.toISOString().slice(0, 10), "2026-10-27");
    assert.equal(tz.localDate(night), "2026-10-26");
  });

  it("calcula el día de la semana y suma días", () => {
    assert.equal(TimeZone.weekday("2026-10-25"), 0);
    assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  });

  it("no acepta un desfase mal escrito", () => {
    assert.throws(() => new TimeZone("-5"));
  });
});

describe("precio final", () => {
  it("aplica el descuento y redondea a pesos", () => {
    assert.equal(finalPrice({ price: 35000, discountPct: 10 }), 31500);
    assert.equal(finalPrice({ price: 15000, discountPct: 0 }), 15000);
    assert.equal(finalPrice({ price: 9999, discountPct: 15 }), 8499);
  });
});

describe("horas libres", () => {
  const date = "2026-10-26";
  const diego = { id: 1, name: "Diego" };
  const andres = { id: 2, name: "Andrés" };
  const base = { date, intervalMin: 30, earliestStart: new Date(0), timeZone: tz };

  it("recorre la jornada y el servicio tiene que caber antes de que se acabe", () => {
    const slots = findFreeSlots({
      ...base,
      durationMin: 60,
      barbers: [{ barber: diego, schedules: [schedule(1, "09:00", "11:00")], busy: [] }],
    });
    assert.deepEqual(slots.map((s) => tz.toLocalIso(s.start).slice(11, 16)), ["09:00", "09:30", "10:00"]);
  });

  it("salta lo ocupado y junta los barberos que pueden a cada hora", () => {
    const slots = findFreeSlots({
      ...base,
      durationMin: 30,
      barbers: [
        {
          barber: diego,
          schedules: [schedule(1, "09:00", "10:30")],
          busy: [{ start: tz.toInstant(date, "09:30"), end: tz.toInstant(date, "10:00") }],
        },
        { barber: andres, schedules: [schedule(2, "09:30", "10:30")], busy: [] },
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

  it("no ofrece horas antes del margen mínimo", () => {
    const slots = findFreeSlots({
      ...base,
      durationMin: 30,
      earliestStart: tz.toInstant(date, "09:45"),
      barbers: [{ barber: diego, schedules: [schedule(1, "09:00", "11:00")], busy: [] }],
    });
    assert.equal(tz.toLocalIso(slots[0].start).slice(11, 16), "10:00");
  });

  it("dice si una cita cabe completa en la jornada", () => {
    const schedules = [schedule(1, "09:00", "12:00")];
    assert.ok(fitsInSchedule(schedules, date, tz, tz.toInstant(date, "11:30"), tz.toInstant(date, "12:00")));
    assert.ok(!fitsInSchedule(schedules, date, tz, tz.toInstant(date, "11:45"), tz.toInstant(date, "12:15")));
  });
});
