import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADMIN, BARBER, at, call, dayFromToday, login, resetDatabase, startApi, stopApi, type Fixtures } from "./harness.js";

let f: Fixtures;
let admin: string;
let barber: string;
let client: string;
const day = dayFromToday(7);

before(async () => {
  f = await resetDatabase();
  await startApi();
  admin = await login(ADMIN.phone, ADMIN.password);
  barber = await login(BARBER.phone, BARBER.password);
  const reg = await call("POST", "/api/cuenta/registro", {
    body: { nombre: "Cliente", telefono: "3170001111", clave: "cliente1234", aceptaDatos: true },
  });
  client = reg.body.token;
});
after(stopApi);

// Un PNG transparente de 1x1
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

describe("acceso al panel", () => {
  it("pide sesión de alguien del equipo", async () => {
    const none = await call("GET", "/api/panel/verificar");
    assert.equal(none.status, 401);
    assert.deepEqual(none.body, { error: "Inicia sesión con una cuenta del equipo" });
    const asClient = await call("GET", "/api/panel/verificar", { token: client });
    assert.equal(asClient.status, 401);
    const asBarber = await call("GET", "/api/panel/verificar", { token: barber });
    assert.deepEqual(asBarber.body, { ok: true });
  });
});

describe("calendario del panel", () => {
  let appointmentId: number;

  it("crea citas presenciales, varias para el mismo cliente", async () => {
    const body = (time: string) => ({
      servicioId: f.haircutId,
      barberoId: f.barberId,
      inicio: at(day, time),
      cliente: { nombre: "Presencial", telefono: "3171234567" },
      notas: "Llega temprano",
    });
    const first = await call("POST", "/api/panel/citas", { token: barber, body: body("09:00") });
    assert.equal(first.status, 201);
    assert.equal(first.body.canal, "PANEL");
    assert.equal(first.body.notas, "Llega temprano");
    appointmentId = first.body.id;
    const second = await call("POST", "/api/panel/citas", { token: barber, body: body("10:00") });
    assert.equal(second.status, 201);
  });

  it("lista las citas entre dos fechas, y si quieren, de un solo barbero", async () => {
    const res = await call("GET", `/api/panel/citas?desde=${day}&hasta=${day}`, { token: admin });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((c: any) => c.inicio), [at(day, "09:00"), at(day, "10:00")]);
    const other = await call("GET", `/api/panel/citas?desde=${day}&hasta=${day}&barberoId=${f.adminId}`, { token: admin });
    assert.deepEqual(other.body, []);
  });

  it("cambia el estado de una cita", async () => {
    const res = await call("PATCH", `/api/panel/citas/${appointmentId}/estado`, { token: barber, body: { estado: "COMPLETADA" } });
    assert.deepEqual(res.body, { id: appointmentId, estado: "COMPLETADA" });
    const missing = await call("PATCH", "/api/panel/citas/9999/estado", { token: barber, body: { estado: "CANCELADA" } });
    assert.equal(missing.status, 404);
    const bad = await call("PATCH", `/api/panel/citas/${appointmentId}/estado`, { token: barber, body: { estado: "OTRO" } });
    assert.equal(bad.status, 400);
  });

  it("lista todos los barberos con sus horarios", async () => {
    const res = await call("GET", "/api/panel/barberos", { token: barber });
    assert.equal(res.body.length, 3);
    assert.equal(res.body[0].nombre, "Diego");
    assert.equal(res.body[0].horarios.length, 7);
    assert.ok("esAdmin" in res.body[0]);
  });

  it("crea, lista y borra bloqueos", async () => {
    const created = await call("POST", "/api/panel/bloqueos", {
      token: barber,
      body: { barberoId: f.barberId, inicio: at(day, "12:00"), fin: at(day, "13:00"), motivo: "Almuerzo" },
    });
    assert.equal(created.status, 201);
    const list = await call("GET", `/api/panel/bloqueos?desde=${day}&hasta=${day}`, { token: barber });
    assert.deepEqual(list.body, [
      {
        id: created.body.id,
        barberoId: f.barberId,
        inicio: at(day, "12:00"),
        fin: at(day, "13:00"),
        motivo: "Almuerzo",
        barbero: { id: f.barberId, nombre: "Andrés" },
      },
    ]);
    const removed = await call("DELETE", `/api/panel/bloqueos/${created.body.id}`, { token: barber });
    assert.equal(removed.status, 204);
    const again = await call("DELETE", `/api/panel/bloqueos/${created.body.id}`, { token: barber });
    assert.equal(again.status, 404);
    assert.deepEqual(again.body, { error: "Bloqueo no encontrado" });
  });
});

describe("administración de servicios", () => {
  let serviceId: number;
  let imageUrl: string;

  it("es solo para el admin", async () => {
    const res = await call("GET", "/api/panel/servicios", { token: barber });
    assert.equal(res.status, 403);
    assert.deepEqual(res.body, { error: "Solo el administrador puede hacer esto" });
  });

  it("sube una imagen y la sirve con caché larga", async () => {
    const res = await call("POST", "/api/panel/imagenes", { token: admin, raw: { type: "image/png", data: PNG } });
    assert.equal(res.status, 201);
    imageUrl = res.body.url;
    assert.match(imageUrl, /^\/api\/imagenes\/\d+$/);
    const served = await fetch(`http://127.0.0.1:${process.env.TEST_PORT ?? 3999}${imageUrl}`);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get("content-type"), "image/png");
    assert.equal(served.headers.get("cache-control"), "public, max-age=31536000, immutable");
    assert.equal(Buffer.from(await served.arrayBuffer()).length, PNG.length);
  });

  it("rechaza archivos que no son imágenes", async () => {
    const res = await call("POST", "/api/panel/imagenes", { token: admin, raw: { type: "text/plain", data: Buffer.from("hola") } });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: "Sube una imagen JPG, PNG o WebP" });
  });

  it("crea un servicio y guarda quién lo creó", async () => {
    const res = await call("POST", "/api/panel/servicios", {
      token: admin,
      body: { nombre: "Cejas", descripcion: "Perfilado", duracionMin: 15, precio: 8000, imagenUrl: imageUrl, activo: true },
    });
    assert.equal(res.status, 201);
    serviceId = res.body.id;
    assert.equal(res.body.imagenUrl, imageUrl);
    assert.deepEqual(res.body.creadoPor, { id: f.adminId, nombre: "Diego" });
    assert.deepEqual(res.body.actualizadoPor, { id: f.adminId, nombre: "Diego" });
    const catalog = await call("GET", "/api/servicios");
    assert.ok(catalog.body.some((s: any) => s.id === serviceId));
  });

  it("oculta un servicio del catálogo y el admin igual lo ve en su lista", async () => {
    const res = await call("PATCH", `/api/panel/servicios/${serviceId}`, { token: admin, body: { activo: false } });
    assert.equal(res.status, 200);
    assert.equal(res.body.activo, false);
    assert.equal(res.body.nombre, "Cejas");
    const catalog = await call("GET", "/api/servicios");
    assert.ok(!catalog.body.some((s: any) => s.id === serviceId));
    const all = await call("GET", "/api/panel/servicios", { token: admin });
    assert.deepEqual(all.body.map((s: any) => s.nombre), ["Corte", "Corte + barba", "Oculto", "Cejas"]);
    assert.equal(all.body[0].creadoPor, null);
  });

  it("valida los datos del servicio y los ids que no existen", async () => {
    const bad = await call("POST", "/api/panel/servicios", {
      token: admin,
      body: { nombre: "", descripcion: "", duracionMin: 1, precio: -5, imagenUrl: null, activo: true },
    });
    assert.equal(bad.status, 400);
    const missing = await call("PATCH", "/api/panel/servicios/9999", { token: admin, body: { precio: 1 } });
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.body, { error: "Servicio no encontrado" });
  });
});
