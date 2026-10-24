import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADMIN, BARBER, at, call, dayFromToday, login, resetDatabase, startApi, stopApi, type Fixtures } from "./harness.js";

let f: Fixtures;
const day = dayFromToday(7);

before(async () => {
  f = await resetDatabase();
  await startApi();
});
after(stopApi);

describe("cuentas", () => {
  let clientToken: string;

  it("registra al cliente, conserva lo que ya había reservado y le da el descuento de bienvenida", async () => {
    // Primero reserva sin cuenta, y al registrarse la cuenta queda en la misma ficha
    const booked = await call("POST", "/api/citas", {
      body: {
        servicioId: f.haircutId,
        inicio: at(day, "09:00"),
        cliente: { nombre: "Sofía", telefono: "3201112222", aceptaDatos: true },
      },
    });
    await call("POST", `/api/citas/${booked.data.id}/cancelar`, { body: { telefono: "3201112222" } });

    const res = await call("POST", "/api/cuenta/registro", {
      body: { nombre: "Sofía R", telefono: "3201112222", clave: "sofia1234", fechaNacimiento: "1999-05-20", aceptaDatos: true },
    });
    assert.equal(res.status, 201);
    // El JWT llega en la cookie, nunca en el cuerpo
    assert.equal(res.data.token, undefined);
    assert.ok(res.sessionToken);
    clientToken = res.sessionToken!;
    assert.deepEqual(res.data.usuario, {
      rol: "CLIENTE",
      nombre: "Sofía R",
      telefono: "573201112222",
      fechaNacimiento: "1999-05-20",
    });
    assert.equal(res.data.descuentoPct, 10);
  });

  it("no deja crear otra cuenta con el mismo teléfono ni con el de alguien del equipo", async () => {
    const again = await call("POST", "/api/cuenta/registro", {
      body: { nombre: "Otra", telefono: "3201112222", clave: "otra1234", aceptaDatos: true },
    });
    assert.equal(again.status, 409);
    assert.deepEqual(again.error, { code: "PHONE_ALREADY_REGISTERED", message: "Ese teléfono ya tiene una cuenta. Inicia sesión.", details: null });
    const team = await call("POST", "/api/cuenta/registro", {
      body: { nombre: "Otra", telefono: ADMIN.phone, clave: "otra1234", aceptaDatos: true },
    });
    assert.equal(team.status, 409);
  });

  it("valida los datos del registro", async () => {
    const short = await call("POST", "/api/cuenta/registro", {
      body: { nombre: "Corta", telefono: "3209998888", clave: "123", aceptaDatos: true },
    });
    assert.equal(short.status, 400);
    const noConsent = await call("POST", "/api/cuenta/registro", {
      body: { nombre: "Sin", telefono: "3209998888", clave: "clave1234", aceptaDatos: false },
    });
    assert.equal(noConsent.status, 400);
  });

  it("inician sesión clientes, barberos y el admin, cada uno con su rol", async () => {
    const client = await call("POST", "/api/cuenta/login", { body: { telefono: "3201112222", clave: "sofia1234" } });
    assert.equal(client.status, 200);
    assert.equal(client.data.usuario.rol, "CLIENTE");
    const admin = await call("POST", "/api/cuenta/login", { body: { telefono: ADMIN.phone, clave: ADMIN.password } });
    assert.deepEqual(admin.data.usuario, { rol: "ADMIN", nombre: "Diego", telefono: "573001112233", fechaNacimiento: null });
    const barber = await call("POST", "/api/cuenta/login", { body: { telefono: BARBER.phone, clave: BARBER.password } });
    assert.equal(barber.data.usuario.rol, "BARBERO");
  });

  it("rechaza una contraseña equivocada", async () => {
    const res = await call("POST", "/api/cuenta/login", { body: { telefono: "3201112222", clave: "mala" } });
    assert.equal(res.status, 401);
    assert.deepEqual(res.error, { code: "INVALID_CREDENTIALS", message: "Teléfono o contraseña incorrectos", details: null });
  });

  it("muestra y edita el perfil, y el teléfono no cambia", async () => {
    const me = await call("GET", "/api/cuenta/yo", { token: clientToken });
    assert.equal(me.status, 200);
    assert.equal(me.data.nombre, "Sofía R");
    const edited = await call("PATCH", "/api/cuenta/yo", {
      token: clientToken,
      body: { nombre: "Sofía Ramírez", fechaNacimiento: null, telefono: "3000000000" },
    });
    assert.equal(edited.status, 200);
    assert.deepEqual(edited.data, { rol: "CLIENTE", nombre: "Sofía Ramírez", telefono: "573201112222", fechaNacimiento: null });
  });

  it("el descuento de bienvenida aplica solo en la primera cita, y esa cita sale como activa", async () => {
    const first = await call("POST", "/api/citas", {
      token: clientToken,
      body: { servicioId: f.beardId, inicio: at(day, "14:00"), cliente: { nombre: "ignorado", telefono: "3000000000", aceptaDatos: false } },
    });
    assert.equal(first.status, 201);
    // Con sesión se usan el nombre y el teléfono de la cuenta, no los del formulario
    assert.equal(first.data.cliente.telefono, "573201112222");
    assert.equal(first.data.cliente.nombre, "Sofía Ramírez");
    assert.equal(first.data.descuentoPct, 10);
    assert.equal(first.data.precioFinal, 31500);

    const active = await call("GET", "/api/cuenta/yo/cita-activa", { token: clientToken });
    assert.equal(active.data.id, first.data.id);

    await call("POST", `/api/citas/${first.data.id}/cancelar`, { body: { telefono: "3201112222" } });
    const second = await call("POST", "/api/citas", {
      token: clientToken,
      body: { servicioId: f.haircutId, inicio: at(day, "16:00"), cliente: { nombre: "x", telefono: "3201112222", aceptaDatos: true } },
    });
    assert.equal(second.data.descuentoPct, 0);
  });

  it("para el equipo la cita activa es null", async () => {
    const token = await login(ADMIN.phone, ADMIN.password);
    const res = await call("GET", "/api/cuenta/yo/cita-activa", { token });
    assert.equal(res.status, 200);
    assert.equal(res.data, null);
  });

  it("al cerrar sesión se borra la cookie, y sin cookie no hay sesión", async () => {
    const out = await call("POST", "/api/cuenta/logout", { token: clientToken });
    assert.equal(out.status, 200);
    assert.equal(out.data, null);
    // La última Set-Cookie de la sesión la deja vacía y vencida
    const last = out.setCookies.filter((c) => c.startsWith("barberia_session=")).at(-1)!;
    assert.match(last, /^barberia_session=;/);
    assert.match(last, /Expires=Thu, 01 Jan 1970/);

    const me = await call("GET", "/api/cuenta/yo");
    assert.equal(me.status, 401);
    assert.deepEqual(me.error, { code: "AUTH_REQUIRED", message: "Inicia sesión para continuar", details: null });
  });
});
