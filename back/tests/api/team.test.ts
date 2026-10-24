/**
 * El equipo y los clientes desde el panel, los nombres de servicio sin repetir y la vista
 * previa del equipo en la web.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADMIN, BARBER, at, call, dayFromToday, login, resetDatabase, startApi, stopApi, type Fixtures } from "./harness.js";

let f: Fixtures;
let admin: string;
let barber: string;
const day = dayFromToday(7);
const week = [1, 2, 3, 4, 5, 6].map((diaSemana) => ({ diaSemana, horaInicio: "09:00", horaFin: "19:00" }));

before(async () => {
  f = await resetDatabase();
  await startApi();
  admin = await login(ADMIN.phone, ADMIN.password);
  barber = await login(BARBER.phone, BARBER.password);
});
after(stopApi);

describe("barberos desde el panel", () => {
  let newId: number;

  it("solo el admin agrega barberos", async () => {
    const body = { nombre: "Camilo", telefono: "3005556677", horarios: week };
    const asBarber = await call("POST", "/api/panel/barberos", { token: barber, body });
    assert.equal(asBarber.status, 403);
    assert.equal(asBarber.error.code, "ADMIN_ONLY");

    const res = await call("POST", "/api/panel/barberos", { token: admin, body });
    assert.equal(res.status, 201);
    newId = res.data.id;
    assert.equal(res.data.telefono, "573005556677");
    assert.equal(res.data.activo, true);
    assert.equal(res.data.tieneCuenta, false);
    assert.deepEqual(
      res.data.horarios.map((h: { diaSemana: number }) => h.diaSemana),
      [1, 2, 3, 4, 5, 6],
    );
  });

  it("no deja nombres ni teléfonos repetidos", async () => {
    const sameName = await call("POST", "/api/panel/barberos", { token: admin, body: { nombre: "CAMILO", telefono: null, horarios: [] } });
    assert.equal(sameName.status, 409);
    assert.equal(sameName.error.code, "BARBER_NAME_TAKEN");
    const samePhone = await call("POST", "/api/panel/barberos", {
      token: admin,
      body: { nombre: "Otro", telefono: BARBER.phone, horarios: [] },
    });
    assert.equal(samePhone.error.code, "PHONE_ALREADY_REGISTERED");
  });

  it("valida las horas y que las jornadas no se pisen", async () => {
    const badHour = await call("PATCH", `/api/panel/barberos/${newId}`, {
      token: admin,
      body: { horarios: [{ diaSemana: 1, horaInicio: "9", horaFin: "18:00" }] },
    });
    assert.equal(badHour.error.code, "VALIDATION_ERROR");
    const backwards = await call("PATCH", `/api/panel/barberos/${newId}`, {
      token: admin,
      body: { horarios: [{ diaSemana: 1, horaInicio: "18:00", horaFin: "09:00" }] },
    });
    assert.equal(backwards.error.code, "INVALID_TIME_RANGE");
    const overlap = await call("PATCH", `/api/panel/barberos/${newId}`, {
      token: admin,
      body: {
        horarios: [
          { diaSemana: 1, horaInicio: "09:00", horaFin: "13:00" },
          { diaSemana: 1, horaInicio: "12:00", horaFin: "18:00" },
        ],
      },
    });
    assert.equal(overlap.error.code, "SCHEDULE_OVERLAP");
  });

  it("cambia la semana y sale en la disponibilidad", async () => {
    const res = await call("PATCH", `/api/panel/barberos/${newId}`, {
      token: admin,
      body: { nombre: "Camilo R", horarios: [{ diaSemana: new Date(`${day}T12:00:00-05:00`).getDay(), horaInicio: "06:00", horaFin: "07:00" }] },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.nombre, "Camilo R");
    assert.equal(res.data.horarios.length, 1);
    const slots = await call("GET", `/api/disponibilidad?servicioId=${f.haircutId}&fecha=${day}&barberoId=${newId}&perPage=100`);
    assert.deepEqual(
      slots.data.map((s: { inicio: string }) => s.inicio),
      [at(day, "06:00"), at(day, "06:30")],
    );
  });

  it("le da cuenta y con ella entra al panel, desactivado ya no", async () => {
    const account = await call("PUT", `/api/panel/barberos/${newId}/cuenta`, { token: admin, body: { clave: "camilo1234" } });
    assert.equal(account.status, 200);
    assert.equal(account.data.tieneCuenta, true);
    assert.equal(account.body.data.claveHash, undefined);
    const token = await login("3005556677", "camilo1234");
    assert.equal((await call("GET", "/api/panel/verificar", { token })).status, 200);

    const off = await call("PATCH", `/api/panel/barberos/${newId}`, { token: admin, body: { activo: false } });
    assert.equal(off.data.activo, false);
    assert.equal((await call("GET", "/api/panel/verificar", { token })).status, 401);
    const bookable = await call("GET", "/api/barberos");
    assert.ok(!bookable.data.some((b: { id: number }) => b.id === newId));
  });

  it("sin teléfono no se le puede dar cuenta", async () => {
    const res = await call("PUT", `/api/panel/barberos/${f.inactiveBarberId}/cuenta`, { token: admin, body: { clave: "clave1234" } });
    assert.equal(res.status, 400);
    assert.equal(res.error.code, "INVALID_DATA");
  });

  it("el admin no se puede desactivar a sí mismo", async () => {
    const res = await call("PATCH", `/api/panel/barberos/${f.adminId}`, { token: admin, body: { activo: false } });
    assert.equal(res.status, 403);
    assert.equal(res.error.code, "OWN_ACCESS_LOCKED");
  });

  it("un barbero que no existe da 404", async () => {
    const res = await call("PATCH", "/api/panel/barberos/9999", { token: admin, body: { nombre: "Nadie" } });
    assert.equal(res.status, 404);
    assert.equal(res.error.code, "BARBER_NOT_FOUND");
  });
});

describe("servicios sin nombre repetido", () => {
  const service = (nombre: string) => ({ nombre, descripcion: "", duracionMin: 30, precio: 20000, imagenUrl: null, activo: true });

  it("no deja crear uno que ya existe, ni siquiera oculto o con tildes", async () => {
    const res = await call("POST", "/api/panel/servicios", { token: admin, body: service("  córte ") });
    assert.equal(res.status, 409);
    assert.equal(res.error.code, "SERVICE_NAME_TAKEN");
    const hidden = await call("POST", "/api/panel/servicios", { token: admin, body: service("OCULTO") });
    assert.equal(hidden.error.code, "SERVICE_NAME_TAKEN");
  });

  it("no deja renombrar uno con el nombre de otro", async () => {
    const res = await call("PATCH", `/api/panel/servicios/${f.beardId}`, { token: admin, body: { nombre: "corte" } });
    assert.equal(res.status, 409);
    const same = await call("PATCH", `/api/panel/servicios/${f.beardId}`, { token: admin, body: { nombre: "Corte + Barba" } });
    assert.equal(same.status, 200);
  });
});

describe("vista previa del equipo en la web", () => {
  // El servicio se pone dentro de cada prueba porque f todavía no está listo aquí
  const booking = {
    inicio: at(day, "15:00"),
    cliente: { nombre: "Diego", telefono: ADMIN.phone, aceptaDatos: true },
  };

  it("con sesión del equipo la web no reserva", async () => {
    const res = await call("POST", "/api/citas", { token: admin, body: { ...booking, servicioId: f.haircutId } });
    assert.equal(res.status, 403);
    assert.equal(res.error.code, "TEAM_PREVIEW_ONLY");
  });

  it("desde el panel sí agenda", async () => {
    const res = await call("POST", "/api/panel/citas", { token: admin, body: { ...booking, servicioId: f.haircutId } });
    assert.equal(res.status, 201);
  });
});

describe("clientes del panel", () => {
  before(async () => {
    const book = (nombre: string, telefono: string, time: string) =>
      call("POST", "/api/citas", { body: { servicioId: f.haircutId, inicio: at(day, time), cliente: { nombre, telefono, aceptaDatos: true } } });
    await book("Laura Pérez", "3101112222", "10:00");
    await call("POST", "/api/cuenta/registro", {
      body: { nombre: "Pedro Gil", telefono: "3203334444", clave: "pedro1234", aceptaDatos: true },
    });
  });

  it("solo el admin los ve", async () => {
    const res = await call("GET", "/api/panel/clientes", { token: barber });
    assert.equal(res.status, 403);
    assert.equal((await call("GET", "/api/panel/clientes")).status, 401);
  });

  it("trae cuenta, datos, citas y la última", async () => {
    const res = await call("GET", "/api/panel/clientes?perPage=100", { token: admin });
    assert.equal(res.status, 200);
    const laura = res.data.find((c: { nombre: string }) => c.nombre === "Laura Pérez");
    assert.equal(laura.telefono, "573101112222");
    assert.equal(laura.tieneCuenta, false);
    assert.equal(laura.aceptaDatos, true);
    assert.equal(laura.citas, 1);
    assert.deepEqual(laura.ultimaCita, { inicio: at(day, "10:00"), estado: "AGENDADA" });
    assert.equal(laura.claveHash, undefined);
    const pedro = res.data.find((c: { nombre: string }) => c.nombre === "Pedro Gil");
    assert.equal(pedro.tieneCuenta, true);
    assert.equal(pedro.citas, 0);
    assert.equal(pedro.ultimaCita, null);
  });

  it("busca por nombre o por teléfono, con paginación", async () => {
    const byName = await call("GET", "/api/panel/clientes?buscar=LAURA", { token: admin });
    assert.deepEqual(
      byName.data.map((c: { nombre: string }) => c.nombre),
      ["Laura Pérez"],
    );
    const byPhone = await call("GET", "/api/panel/clientes?buscar=320%20333", { token: admin });
    assert.deepEqual(
      byPhone.data.map((c: { nombre: string }) => c.nombre),
      ["Pedro Gil"],
    );
    const first = await call("GET", "/api/panel/clientes?perPage=1", { token: admin });
    assert.equal(first.data.length, 1);
    assert.ok(first.pagination!.total >= 2);
  });
});
