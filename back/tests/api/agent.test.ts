import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADMIN, at, call, dayFromToday, resetDatabase, startApi, stopApi, type Fixtures } from "./harness.js";

let f: Fixtures;
const day = dayFromToday(7);

before(async () => {
  f = await resetDatabase();
  await startApi();
});
after(stopApi);

describe("agente de WhatsApp", () => {
  it("las rutas internas no funcionan sin la clave del agente", async () => {
    const res = await call("GET", "/api/interno/contactos/3001112233");
    assert.equal(res.status, 401);
    assert.deepEqual(res.error, { code: "INVALID_API_KEY", message: "No autorizado", details: null });
  });

  it("por WhatsApp se agenda sin la casilla de datos de la web", async () => {
    const res = await call("POST", "/api/citas", {
      agent: true,
      body: { servicioId: f.haircutId, inicio: at(day, "10:00"), cliente: { nombre: "Juan", telefono: "573151234567" } },
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.canal, "WHATSAPP");
  });

  it("reconoce a un barbero por el teléfono", async () => {
    const res = await call("GET", `/api/interno/contactos/${ADMIN.phone}`, { agent: true });
    assert.deepEqual(res.data, { tipo: "barbero", barbero: { id: f.adminId, nombre: "Diego" } });
  });

  it("describe a un cliente con sus próximas citas, y a un teléfono que no conoce", async () => {
    const res = await call("GET", "/api/interno/contactos/3151234567", { agent: true });
    assert.equal(res.data.tipo, "cliente");
    assert.deepEqual(res.data.cliente, { nombre: "Juan", registrado: false, descuentoPendientePct: 0 });
    assert.equal(res.data.citasProximas.length, 1);
    assert.equal(res.data.citasProximas[0].inicio, at(day, "10:00"));

    const unknown = await call("GET", "/api/interno/contactos/3159999999", { agent: true });
    assert.deepEqual(unknown.data, { tipo: "cliente", cliente: null, citasProximas: [] });
  });

  it("muestra el descuento de bienvenida pendiente de un cliente registrado", async () => {
    await call("POST", "/api/cuenta/registro", {
      body: { nombre: "Nuevo", telefono: "3157778888", clave: "nuevo1234", aceptaDatos: true },
    });
    const res = await call("GET", "/api/interno/contactos/3157778888", { agent: true });
    assert.deepEqual(res.data.cliente, { nombre: "Nuevo", registrado: true, descuentoPendientePct: 10 });
  });

  it("trae la agenda del día sin las citas canceladas", async () => {
    const other = await call("POST", "/api/citas", {
      agent: true,
      body: { servicioId: f.haircutId, barberoId: f.barberId, inicio: at(day, "11:00"), cliente: { nombre: "Cancela", telefono: "3150000000" } },
    });
    await call("POST", `/api/citas/${other.data.id}/cancelar`, { body: { telefono: "3150000000" } });

    const all = await call("GET", `/api/interno/agenda?fecha=${day}`, { agent: true });
    assert.deepEqual(all.data.map((c: any) => c.inicio), [at(day, "10:00")]);
    const byBarber = await call("GET", `/api/interno/agenda?fecha=${day}&barberoId=${f.barberId}`, { agent: true });
    assert.deepEqual(byBarber.data, []);
  });

  it("bloquea horas de un barbero y valida el rango", async () => {
    const res = await call("POST", "/api/interno/bloqueos", {
      agent: true,
      body: { barberoId: f.barberId, inicio: at(day, "13:00"), fin: at(day, "14:00"), motivo: "Almuerzo" },
    });
    assert.equal(res.status, 201);
    assert.deepEqual(res.data, {
      id: res.data.id,
      barberoId: f.barberId,
      inicio: at(day, "13:00"),
      fin: at(day, "14:00"),
      motivo: "Almuerzo",
      barbero: { id: f.barberId, nombre: "Andrés" },
    });
    const free = await call("GET", `/api/disponibilidad?servicioId=${f.haircutId}&fecha=${day}&barberoId=${f.barberId}&perPage=100`);
    assert.ok(!free.data.some((h: any) => h.inicio === at(day, "13:30")));

    const backwards = await call("POST", "/api/interno/bloqueos", {
      agent: true,
      body: { barberoId: f.barberId, inicio: at(day, "15:00"), fin: at(day, "14:00") },
    });
    assert.equal(backwards.status, 400);
    assert.deepEqual(backwards.error, { code: "INVALID_TIME_RANGE", message: "El fin debe ser después del inicio", details: null });
  });
});
