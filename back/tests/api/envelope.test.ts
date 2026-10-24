/**
 * Cuida el formato de las respuestas. Si alguien agrega una ruta que no use el sobre,
 * o cambia sus llaves, estas pruebas se caen.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADMIN, BASE, call, login, resetDatabase, startApi, stopApi, type Fixtures } from "./harness.js";

let f: Fixtures;

before(async () => {
  f = await resetDatabase();
  await startApi();
});
after(stopApi);

function assertSuccess(body: any) {
  assert.equal(body.success, true);
  assert.equal(body.error, null);
  assert.ok("data" in body);
}

function assertFailure(body: any, code: string) {
  assert.deepEqual(Object.keys(body).sort(), ["data", "error", "success"]);
  assert.equal(body.success, false);
  assert.equal(body.data, null);
  assert.deepEqual(Object.keys(body.error).sort(), ["code", "details", "message"]);
  assert.equal(body.error.code, code);
  assert.equal(typeof body.error.message, "string");
}

describe("sobre de las respuestas", () => {
  it("un objeto viene en data con success true y error null", async () => {
    const res = await call("GET", "/salud");
    assert.deepEqual(res.body, { success: true, data: { ok: true }, error: null });
  });

  it("una lista viene en data con su paginación", async () => {
    const res = await call("GET", "/api/servicios");
    assertSuccess(res.body);
    assert.deepEqual(Object.keys(res.body).sort(), ["data", "error", "pagination", "success"]);
    assert.ok(Array.isArray(res.data));
    assert.deepEqual(res.pagination, { page: 1, perPage: 20, total: 2 });
  });

  it("las páginas se piden con page y perPage", async () => {
    const first = await call("GET", "/api/barberos?perPage=1");
    const second = await call("GET", "/api/barberos?page=2&perPage=1");
    const empty = await call("GET", "/api/barberos?page=3&perPage=1");
    assert.deepEqual(first.data, [{ id: f.adminId, nombre: "Diego" }]);
    assert.deepEqual(second.data, [{ id: f.barberId, nombre: "Andrés" }]);
    assert.deepEqual(empty.data, []);
    assert.deepEqual(second.pagination, { page: 2, perPage: 1, total: 2 });
  });

  it("no deja pedir más de 100 por página ni páginas raras", async () => {
    const tooMany = await call("GET", "/api/servicios?perPage=500");
    assert.equal(tooMany.status, 400);
    assertFailure(tooMany.body, "VALIDATION_ERROR");
    const zero = await call("GET", "/api/servicios?page=0");
    assertFailure(zero.body, "VALIDATION_ERROR");
  });

  it("lo que no devuelve nada responde data null en vez de vacío", async () => {
    const token = await login(ADMIN.phone, ADMIN.password);
    const res = await call("POST", "/api/cuenta/logout", { token });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { success: true, data: null, error: null });
  });
});

describe("errores", () => {
  it("un error del negocio trae su código y el mensaje en español", async () => {
    const res = await call("GET", "/api/citas/999?telefono=3000000000");
    assert.equal(res.status, 404);
    assertFailure(res.body, "APPOINTMENT_NOT_FOUND");
    assert.equal(res.error.message, "Cita no encontrada");
  });

  it("un error de validación dice qué campo falló, en español", async () => {
    const res = await call("GET", "/api/disponibilidad?servicioId=abc&fecha=mañana");
    assert.equal(res.status, 400);
    assertFailure(res.body, "VALIDATION_ERROR");
    const fields = (res.error.details as { field: string; message: string }[]).map((d) => d.field).sort();
    assert.deepEqual(fields, ["fecha", "servicioId"]);
    assert.match((res.error.details as { message: string }[])[0].message, /[áéíóúñ]|Entrada|Formato/);
  });

  it("los de permisos también vienen en el sobre", async () => {
    assertFailure((await call("GET", "/api/panel/citas")).body, "TEAM_ONLY");
    assertFailure((await call("GET", "/api/cuenta/yo")).body, "AUTH_REQUIRED");
    assertFailure((await call("GET", "/api/interno/agenda")).body, "INVALID_API_KEY");
    const barberToken = await login("3004445566", "barbero1234");
    assertFailure((await call("GET", "/api/panel/servicios", { token: barberToken })).body, "ADMIN_ONLY");
  });

  it("una ruta que no existe y un JSON mal escrito también", async () => {
    const missing = await call("GET", "/api/no-existe");
    assert.equal(missing.status, 404);
    assertFailure(missing.body, "ROUTE_NOT_FOUND");

    const res = await fetch(`${BASE}/api/citas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{malo",
    });
    assert.equal(res.status, 400);
    assertFailure(await res.json(), "INVALID_JSON");
  });
});
