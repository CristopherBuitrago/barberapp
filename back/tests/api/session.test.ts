/**
 * La sesión: un JWT en una cookie httpOnly que dura SESION_MINUTOS y se renueva con cada
 * petición. Aquí el back arranca con una sesión de 6 segundos para ver que vence de verdad.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADMIN, BARBER, call, db, login, resetDatabase, startApi, stopApi } from "./harness.js";

const SESSION_SECONDS = 6;
const wait = (seconds: number) => new Promise((r) => setTimeout(r, seconds * 1000));

before(async () => {
  await resetDatabase();
  await startApi({ SESION_MINUTOS: String(SESSION_SECONDS / 60) });
});
after(stopApi);

describe("sesión con JWT en cookie", () => {
  it("el login deja la cookie httpOnly y no manda el token en el cuerpo", async () => {
    const res = await call("POST", "/api/cuenta/login", { body: { telefono: ADMIN.phone, clave: ADMIN.password } });
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.data), ["usuario"]);
    const cookie = res.setCookies.find((c) => c.startsWith("barberia_session="))!;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Path=\//);
    // Es un JWT: tres partes separadas por punto
    assert.equal(res.sessionToken!.split(".").length, 3);
  });

  it("cada petición con sesión devuelve un token nuevo", async () => {
    const first = await login(ADMIN.phone, ADMIN.password);
    await wait(1.1);
    const res = await call("GET", "/api/panel/verificar", { token: first });
    assert.equal(res.status, 200);
    assert.ok(res.sessionToken);
    assert.notEqual(res.sessionToken, first);
  });

  it("si la persona sigue usando la web la sesión no vence, si se queda quieta sí", async () => {
    const first = await login(ADMIN.phone, ADMIN.password);
    await wait(SESSION_SECONDS - 2);
    // Antes de vencer usa la web y recibe otros 6 segundos
    const renewed = (await call("GET", "/api/cuenta/yo", { token: first })).sessionToken!;
    await wait(4);
    // Ya pasaron 8 segundos desde el login, pero solo 4 desde la última vez que la usó
    const still = await call("GET", "/api/cuenta/yo", { token: renewed });
    assert.equal(still.status, 200);
    assert.equal(still.data.rol, "ADMIN");

    // El token del login ya venció
    const old = await call("GET", "/api/cuenta/yo", { token: first });
    assert.equal(old.status, 401);
    assert.equal(old.error.code, "AUTH_REQUIRED");

    // Y si se queda quieta más que la sesión, también el renovado
    await wait(SESSION_SECONDS + 1);
    const idle = await call("GET", "/api/cuenta/yo", { token: still.sessionToken });
    assert.equal(idle.status, 401);
    // Al llegar con un token que ya no sirve, el back le borra la cookie
    assert.equal(idle.sessionToken, "");
  });

  it("un token inventado o firmado con otra clave no sirve", async () => {
    const res = await call("GET", "/api/cuenta/yo", { token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJiYXJiZXI6MSJ9.firmafalsa" });
    assert.equal(res.status, 401);
    assert.equal(res.sessionToken, "");
  });

  it("si desactivan al barbero su sesión se cae aunque el token no haya vencido", async () => {
    const token = await login(BARBER.phone, BARBER.password);
    assert.equal((await call("GET", "/api/panel/verificar", { token })).status, 200);
    await db.barbero.updateMany({ where: { telefono: "57" + BARBER.phone }, data: { activo: false } });
    const res = await call("GET", "/api/panel/verificar", { token });
    assert.equal(res.status, 401);
    assert.equal(res.error.code, "TEAM_ONLY");
  });
});
