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
  // La sesión del registro llega en la cookie
  client = reg.sessionToken!;
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
    assert.deepEqual(none.error, { code: "TEAM_ONLY", message: "Inicia sesión con una cuenta del equipo", details: null });
    const asClient = await call("GET", "/api/panel/verificar", { token: client });
    assert.equal(asClient.status, 401);
    const asBarber = await call("GET", "/api/panel/verificar", { token: barber });
    assert.deepEqual(asBarber.data, { ok: true });
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
    assert.equal(first.data.canal, "PANEL");
    assert.equal(first.data.notas, "Llega temprano");
    appointmentId = first.data.id;
    const second = await call("POST", "/api/panel/citas", { token: barber, body: body("10:00") });
    assert.equal(second.status, 201);
  });

  it("lista las citas entre dos fechas, y si quieren, de un solo barbero", async () => {
    const res = await call("GET", `/api/panel/citas?desde=${day}&hasta=${day}`, { token: admin });
    assert.equal(res.status, 200);
    assert.deepEqual(res.data.map((c: any) => c.inicio), [at(day, "09:00"), at(day, "10:00")]);
    const other = await call("GET", `/api/panel/citas?desde=${day}&hasta=${day}&barberoId=${f.adminId}`, { token: admin });
    assert.deepEqual(other.data, []);
  });

  it("cambia el estado de una cita", async () => {
    const res = await call("PATCH", `/api/panel/citas/${appointmentId}/estado`, { token: barber, body: { estado: "COMPLETADA" } });
    // Devuelve la cita completa como cualquier otra respuesta de una cita
    assert.equal(res.data.id, appointmentId);
    assert.equal(res.data.estado, "COMPLETADA");
    const missing = await call("PATCH", "/api/panel/citas/9999/estado", { token: barber, body: { estado: "CANCELADA" } });
    assert.equal(missing.status, 404);
    const bad = await call("PATCH", `/api/panel/citas/${appointmentId}/estado`, { token: barber, body: { estado: "OTRO" } });
    assert.equal(bad.status, 400);
  });

  it("lista todos los barberos con sus horarios", async () => {
    const res = await call("GET", "/api/panel/barberos", { token: barber });
    assert.equal(res.data.length, 3);
    assert.equal(res.data[0].nombre, "Diego");
    assert.equal(res.data[0].horarios.length, 7);
    assert.ok("esAdmin" in res.data[0]);
  });

  it("crea, lista y borra bloqueos", async () => {
    const created = await call("POST", "/api/panel/bloqueos", {
      token: barber,
      body: { barberoId: f.barberId, inicio: at(day, "12:00"), fin: at(day, "13:00"), motivo: "Almuerzo" },
    });
    assert.equal(created.status, 201);
    const list = await call("GET", `/api/panel/bloqueos?desde=${day}&hasta=${day}`, { token: barber });
    assert.deepEqual(list.data, [
      {
        id: created.data.id,
        barberoId: f.barberId,
        inicio: at(day, "12:00"),
        fin: at(day, "13:00"),
        motivo: "Almuerzo",
        barbero: { id: f.barberId, nombre: "Andrés" },
      },
    ]);
    const removed = await call("DELETE", `/api/panel/bloqueos/${created.data.id}`, { token: barber });
    assert.equal(removed.status, 200);
    assert.deepEqual(removed.body, { success: true, data: null, error: null });
    const again = await call("DELETE", `/api/panel/bloqueos/${created.data.id}`, { token: barber });
    assert.equal(again.status, 404);
    assert.deepEqual(again.error, { code: "TIME_BLOCK_NOT_FOUND", message: "Bloqueo no encontrado", details: null });
  });
});

describe("administración de servicios", () => {
  let serviceId: number;
  let imageUrl: string;

  it("es solo para el admin", async () => {
    const res = await call("GET", "/api/panel/servicios", { token: barber });
    assert.equal(res.status, 403);
    assert.deepEqual(res.error, { code: "ADMIN_ONLY", message: "Solo el administrador puede hacer esto", details: null });
  });

  it("sube una imagen y la sirve con caché larga", async () => {
    const res = await call("POST", "/api/panel/imagenes", { token: admin, raw: { type: "image/png", data: PNG } });
    assert.equal(res.status, 201);
    imageUrl = res.data.url;
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
    assert.deepEqual(res.error, { code: "INVALID_IMAGE", message: "Sube una imagen JPG, PNG o WebP", details: null });
  });

  it("crea un servicio y guarda quién lo creó", async () => {
    const res = await call("POST", "/api/panel/servicios", {
      token: admin,
      body: { nombre: "Cejas", descripcion: "Perfilado", duracionMin: 15, precio: 8000, imagenUrl: imageUrl, activo: true },
    });
    assert.equal(res.status, 201);
    serviceId = res.data.id;
    assert.equal(res.data.imagenUrl, imageUrl);
    assert.deepEqual(res.data.creadoPor, { id: f.adminId, nombre: "Diego" });
    assert.deepEqual(res.data.actualizadoPor, { id: f.adminId, nombre: "Diego" });
    const catalog = await call("GET", "/api/servicios");
    assert.ok(catalog.data.some((s: any) => s.id === serviceId));
  });

  it("oculta un servicio del catálogo y el admin igual lo ve en su lista", async () => {
    const res = await call("PATCH", `/api/panel/servicios/${serviceId}`, { token: admin, body: { activo: false } });
    assert.equal(res.status, 200);
    assert.equal(res.data.activo, false);
    assert.equal(res.data.nombre, "Cejas");
    const catalog = await call("GET", "/api/servicios");
    assert.ok(!catalog.data.some((s: any) => s.id === serviceId));
    const all = await call("GET", "/api/panel/servicios", { token: admin });
    assert.deepEqual(all.data.map((s: any) => s.nombre), ["Corte", "Corte + barba", "Oculto", "Cejas"]);
    assert.equal(all.data[0].creadoPor, null);
  });

  it("valida los datos del servicio y los ids que no existen", async () => {
    const bad = await call("POST", "/api/panel/servicios", {
      token: admin,
      body: { nombre: "", descripcion: "", duracionMin: 1, precio: -5, imagenUrl: null, activo: true },
    });
    assert.equal(bad.status, 400);
    const missing = await call("PATCH", "/api/panel/servicios/9999", { token: admin, body: { precio: 1 } });
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.error, { code: "SERVICE_NOT_FOUND", message: "Servicio no encontrado", details: null });
  });
});
