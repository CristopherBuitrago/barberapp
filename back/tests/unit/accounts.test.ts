import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { AuthenticateSession } from "../../src/application/use-cases/accounts/AuthenticateSession.js";
import { Login } from "../../src/application/use-cases/accounts/Login.js";
import { RegisterClient } from "../../src/application/use-cases/accounts/RegisterClient.js";
import { SessionIssuer } from "../../src/application/use-cases/accounts/SessionIssuer.js";
import { UpdateProfile } from "../../src/application/use-cases/accounts/UpdateProfile.js";
import { SaveTeamAccount } from "../../src/application/use-cases/barbers/SaveTeamAccount.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../src/domain/errors/DomainError.js";
import { ErrorCode } from "../../src/domain/errors/ErrorCode.js";
import { CountingTokens, FixedClock, fakeHasher, memoryRepositories } from "./fakes.js";

let repos: ReturnType<typeof memoryRepositories>;
let clock: FixedClock;
let tokens: CountingTokens;
let issuer: SessionIssuer;

beforeEach(() => {
  repos = memoryRepositories();
  clock = new FixedClock(new Date("2026-10-26T13:00:00Z"));
  tokens = new CountingTokens();
  issuer = new SessionIssuer(repos.sessions, tokens, clock);
});

const login = () => new Login(repos.barbers, repos.clients, fakeHasher, issuer);
const register = () => new RegisterClient(repos.barbers, repos.clients, fakeHasher, issuer, clock, 10);
const authenticate = () => new AuthenticateSession(repos.sessions, tokens, clock);

describe("registro", () => {
  it("si ya había reservado sin cuenta, la cuenta queda en la misma ficha", async () => {
    const before = repos.store.addClient({ name: "Sofía", phone: "573201112222" });
    const result = await register().execute({ name: "Sofía R", phone: "3201112222", password: "sofia1234" });
    assert.equal(repos.store.clients.size, 1);
    const saved = repos.store.clients.get(before.id)!;
    assert.equal(saved.name, "Sofía R");
    assert.equal(saved.hasAccount, true);
    assert.equal(result.profile.role, "CLIENTE");
    assert.equal(result.welcomeDiscountPct, 10);
  });

  it("no deja registrar el teléfono de alguien del equipo ni uno que ya tiene cuenta", async () => {
    repos.store.addBarber("Diego", { phone: "573001112233", active: false });
    await assert.rejects(register().execute({ name: "X", phone: "3001112233", password: "clave1234" }), ConflictError);
    await register().execute({ name: "Y", phone: "3209990000", password: "clave1234" });
    await assert.rejects(register().execute({ name: "Y", phone: "3209990000", password: "otra1234" }), ConflictError);
  });

  it("si el descuento ya se usó, no lo vuelve a ofrecer", async () => {
    repos.store.addClient({ name: "Ana", phone: "573102220000", welcomeDiscountUsed: true });
    const result = await register().execute({ name: "Ana", phone: "3102220000", password: "ana12345" });
    assert.equal(result.welcomeDiscountPct, 0);
  });
});

describe("inicio de sesión", () => {
  it("alguien del equipo entra con su rol", async () => {
    repos.store.addBarber("Diego", { phone: "573001112233", passwordHash: "hash:admin1234", isAdmin: true });
    const result = await login().execute({ phone: "3001112233", password: "admin1234" });
    assert.equal(result.profile.role, "ADMIN");
  });

  it("si el teléfono es del equipo no lo prueba como cliente aunque tenga cuenta de cliente", async () => {
    repos.store.addBarber("Diego", { phone: "573001112233", passwordHash: "hash:panel1234" });
    repos.store.addClient({ name: "Diego", phone: "573001112233", passwordHash: "hash:cliente1234" });
    await assert.rejects(login().execute({ phone: "3001112233", password: "cliente1234" }), UnauthorizedError);
  });

  it("un barbero sin contraseña no bloquea la cuenta de cliente con ese teléfono", async () => {
    repos.store.addBarber("Diego", { phone: "573001112233" });
    repos.store.addClient({ name: "Diego", phone: "573001112233", passwordHash: "hash:cliente1234" });
    const result = await login().execute({ phone: "3001112233", password: "cliente1234" });
    assert.equal(result.profile.role, "CLIENTE");
  });

  it("rechaza una contraseña equivocada", async () => {
    repos.store.addClient({ name: "Ana", phone: "573102220000", passwordHash: "hash:ana12345" });
    await assert.rejects(
      login().execute({ phone: "3102220000", password: "mala" }),
      new UnauthorizedError("Teléfono o contraseña incorrectos", ErrorCode.InvalidCredentials),
    );
  });
});

describe("sesiones y perfil", () => {
  it("el token sirve hasta que vence a los 30 días", async () => {
    const client = repos.store.addClient({ name: "Ana", phone: "573102220000" });
    const token = await issuer.issue(client);
    const session = await authenticate().execute(token);
    assert.ok(session?.client?.equals(client));
    clock.current = new Date(clock.current.getTime() + 30 * 24 * 60 * 60 * 1000);
    assert.equal(await authenticate().execute(token), null);
  });

  it("si desactivan al barbero, su sesión deja de servir", async () => {
    const barber = repos.store.addBarber("Andrés", { phone: "573004445566" });
    const token = await issuer.issue(barber);
    assert.equal((await authenticate().execute(token))?.role, "BARBERO");
    repos.store.barbers.get(barber.id)!.active = false;
    assert.equal(await authenticate().execute(token), null);
  });

  it("el cliente edita nombre y fecha, y queda guardado", async () => {
    const client = repos.store.addClient({ name: "Ana", phone: "573102220000" });
    const session = (await authenticate().execute(await issuer.issue(client)))!;
    const update = new UpdateProfile(repos.clients, repos.barbers);
    const profile = await update.execute({ session, name: "Ana María", birthDate: "1995-03-04" });
    assert.equal(profile.birthDate, "1995-03-04");
    assert.equal(repos.store.clients.get(client.id)!.name, "Ana María");
  });
});

describe("cuenta del equipo", () => {
  it("busca al barbero por nombre sin importar mayúsculas y le pone la cuenta", async () => {
    const created = repos.store.addBarber("Diego");
    const save = new SaveTeamAccount(repos.barbers, repos.clients, fakeHasher);
    await save.execute({ name: "diego", phone: "3001234567", password: "diego1234", isAdmin: true });
    const saved = repos.store.barbers.get(created.id)!;
    assert.equal(saved.phone, "573001234567");
    assert.equal(saved.isAdmin, true);
    assert.equal(saved.passwordHash, "hash:diego1234");
  });

  it("si el barbero no existe dice cuáles hay", async () => {
    repos.store.addBarber("Diego");
    const save = new SaveTeamAccount(repos.barbers, repos.clients, fakeHasher);
    await assert.rejects(
      save.execute({ name: "Nadie", phone: "3001234567", password: "clave1234", isAdmin: false }),
      new NotFoundError('No hay un barbero llamado "Nadie". Barberos: Diego', ErrorCode.BarberNotFound),
    );
  });
});
