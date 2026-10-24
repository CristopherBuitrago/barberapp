import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { at, call, dayFromToday, resetDatabase, startApi, stopApi, type Fixtures } from "./harness.js";

let f: Fixtures;
const day = dayFromToday(7);

before(async () => {
  f = await resetDatabase();
  await startApi();
});
after(stopApi);

const webAppointment = (overrides: Record<string, unknown> = {}) => ({
  servicioId: f.haircutId,
  barberoId: f.barberId,
  inicio: at(day, "10:00"),
  cliente: { nombre: "Laura", telefono: "3101234567", aceptaDatos: true },
  ...overrides,
});

describe("catálogo", () => {
  it("lista solo los servicios activos, en orden de id", async () => {
    const res = await call("GET", "/api/servicios");
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.map((s: any) => s.nombre),
      ["Corte", "Corte + barba"],
    );
    assert.deepEqual(Object.keys(res.body[0]).sort(), [
      "activo", "actualizadoEn", "actualizadoPorId", "creadoEn", "creadoPorId",
      "descripcion", "duracionMin", "id", "imagenUrl", "nombre", "precio",
    ]);
  });

  it("lista solo los barberos activos con id y nombre", async () => {
    const res = await call("GET", "/api/barberos");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, [
      { id: f.adminId, nombre: "Diego" },
      { id: f.barberId, nombre: "Andrés" },
    ]);
  });

  it("da 404 si la imagen no existe", async () => {
    const res = await call("GET", "/api/imagenes/999");
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: "Imagen no encontrada" });
  });
});

describe("disponibilidad", () => {
  it("ofrece todas las horas de la jornada con los barberos libres en cada una", async () => {
    const res = await call("GET", `/api/disponibilidad?servicioId=${f.haircutId}&fecha=${day}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 24); // De 08:00 a 19:30, cada media hora
    assert.deepEqual(res.body[0], {
      inicio: at(day, "08:00"),
      barberos: [
        { id: f.adminId, nombre: "Diego" },
        { id: f.barberId, nombre: "Andrés" },
      ],
    });
    assert.equal(res.body.at(-1).inicio, at(day, "19:30"));
  });

  it("el servicio tiene que caber completo en la jornada", async () => {
    const res = await call("GET", `/api/disponibilidad?servicioId=${f.beardId}&fecha=${day}&barberoId=${f.barberId}`);
    assert.equal(res.body.length, 23); // El último arranca a las 19:00 porque dura una hora
    assert.deepEqual(res.body[0].barberos, [{ id: f.barberId, nombre: "Andrés" }]);
  });

  it("rechaza un servicio oculto y datos malos", async () => {
    const hidden = await call("GET", `/api/disponibilidad?servicioId=${f.hiddenServiceId}&fecha=${day}`);
    assert.equal(hidden.status, 404);
    assert.deepEqual(hidden.body, { error: "Servicio no encontrado" });
    const bad = await call("GET", `/api/disponibilidad?servicioId=abc&fecha=mañana`);
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error, "Datos inválidos");
  });
});

describe("citas por la web", () => {
  let appointmentId: number;

  it("agenda una cita y la devuelve con su forma pública", async () => {
    const res = await call("POST", "/api/citas", { body: webAppointment() });
    assert.equal(res.status, 201);
    appointmentId = res.body.id;
    assert.deepEqual(res.body, {
      id: appointmentId,
      inicio: at(day, "10:00"),
      fin: at(day, "10:30"),
      estado: "AGENDADA",
      canal: "WEB",
      precio: 20000,
      descuentoPct: 0,
      precioFinal: 20000,
      notas: "",
      barbero: { id: f.barberId, nombre: "Andrés" },
      servicio: { id: f.haircutId, nombre: "Corte", duracionMin: 30 },
      cliente: { id: res.body.cliente.id, nombre: "Laura", telefono: "573101234567" },
    });
  });

  it("la hora agendada desaparece de la disponibilidad de ese barbero", async () => {
    const res = await call("GET", `/api/disponibilidad?servicioId=${f.haircutId}&fecha=${day}&barberoId=${f.barberId}`);
    assert.ok(!res.body.some((h: any) => h.inicio === at(day, "10:00")));
    assert.equal(res.body.length, 23);
  });

  it("no deja agendar la misma hora con el mismo barbero", async () => {
    const res = await call("POST", "/api/citas", {
      body: webAppointment({ cliente: { nombre: "Otro", telefono: "3109990000", aceptaDatos: true } }),
    });
    assert.equal(res.status, 409);
    assert.deepEqual(res.body, { error: "Esa hora ya no está disponible con ese barbero" });
  });

  it("cada cliente puede tener una sola cita activa", async () => {
    const res = await call("POST", "/api/citas", { body: webAppointment({ inicio: at(day, "15:00") }) });
    assert.equal(res.status, 409);
    assert.deepEqual(res.body, {
      error: "Ya tienes una cita agendada. Cancélala o espera a que pase para reservar otra.",
    });
  });

  it("en la web hay que aceptar el tratamiento de datos", async () => {
    const res = await call("POST", "/api/citas", {
      body: webAppointment({ cliente: { nombre: "Sin", telefono: "3107770000", aceptaDatos: false } }),
    });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: "Debes aceptar el tratamiento de datos personales" });
  });

  it("si no eligen barbero, le toca al primero que esté libre", async () => {
    const res = await call("POST", "/api/citas", {
      body: webAppointment({
        barberoId: undefined,
        cliente: { nombre: "Pedro", telefono: "3105550000", aceptaDatos: true },
      }),
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.barbero.id, f.adminId);
  });

  it("rechaza horas pasadas, servicios ocultos y horas fuera de la jornada", async () => {
    const someone = { nombre: "X", telefono: "3100000001", aceptaDatos: true };
    const past = await call("POST", "/api/citas", { body: webAppointment({ inicio: at(dayFromToday(-1), "10:00"), cliente: someone }) });
    assert.equal(past.status, 400);
    assert.deepEqual(past.body, { error: "Esa hora ya pasó" });
    const hidden = await call("POST", "/api/citas", { body: webAppointment({ servicioId: f.hiddenServiceId, cliente: someone }) });
    assert.equal(hidden.status, 404);
    const late = await call("POST", "/api/citas", { body: webAppointment({ inicio: at(day, "19:45"), cliente: someone }) });
    assert.equal(late.status, 409);
  });

  it("la cita solo se le muestra al teléfono del dueño", async () => {
    const own = await call("GET", `/api/citas/${appointmentId}?telefono=3101234567`);
    assert.equal(own.status, 200);
    assert.equal(own.body.id, appointmentId);
    const other = await call("GET", `/api/citas/${appointmentId}?telefono=3100000000`);
    assert.equal(other.status, 404);
    assert.deepEqual(other.body, { error: "Cita no encontrada" });
  });

  it("reprograma a una hora libre y no a una ocupada", async () => {
    const res = await call("POST", `/api/citas/${appointmentId}/reprogramar`, {
      body: { telefono: "3101234567", inicio: at(day, "11:00") },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.inicio, at(day, "11:00"));
    assert.equal(res.body.fin, at(day, "11:30"));

    await call("POST", "/api/citas", {
      body: webAppointment({ inicio: at(day, "12:00"), cliente: { nombre: "Ana", telefono: "3102220000", aceptaDatos: true } }),
    });
    const busy = await call("POST", `/api/citas/${appointmentId}/reprogramar`, {
      body: { telefono: "3101234567", inicio: at(day, "12:00") },
    });
    assert.equal(busy.status, 409);
  });

  it("cancela, y una cita cancelada no se puede volver a cancelar", async () => {
    const res = await call("POST", `/api/citas/${appointmentId}/cancelar`, { body: { telefono: "3101234567" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.estado, "CANCELADA");
    const again = await call("POST", `/api/citas/${appointmentId}/cancelar`, { body: { telefono: "3101234567" } });
    assert.equal(again.status, 409);
    assert.deepEqual(again.body, { error: "La cita ya no está activa" });
    const lookup = await call("GET", `/api/citas/${appointmentId}?telefono=3101234567`);
    assert.equal(lookup.body.estado, "CANCELADA");
  });

  it("después de cancelar, el cliente puede volver a reservar", async () => {
    const res = await call("POST", "/api/citas", { body: webAppointment({ inicio: at(day, "16:00") }) });
    assert.equal(res.status, 201);
  });
});
