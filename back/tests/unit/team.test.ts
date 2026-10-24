import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateAppointment } from "../../src/application/use-cases/appointments/CreateAppointment.js";
import { CreateBarber } from "../../src/application/use-cases/barbers/CreateBarber.js";
import { GiveBarberAccount } from "../../src/application/use-cases/barbers/GiveBarberAccount.js";
import { UpdateBarber } from "../../src/application/use-cases/barbers/UpdateBarber.js";
import { ListClients } from "../../src/application/use-cases/clients/ListClients.js";
import { CreateService } from "../../src/application/use-cases/services/CreateService.js";
import { UpdateService } from "../../src/application/use-cases/services/UpdateService.js";
import { BookingChannel } from "../../src/domain/entities/Appointment.js";
import { Barber } from "../../src/domain/entities/Barber.js";
import { ConflictError, ForbiddenError, RuleViolationError } from "../../src/domain/errors/DomainError.js";
import { ErrorCode } from "../../src/domain/errors/ErrorCode.js";
import { nameKey } from "../../src/domain/value-objects/NameKey.js";
import { TimeZone } from "../../src/domain/value-objects/TimeZone.js";
import { FixedClock, fakeHasher, memoryRepositories } from "./fakes.js";

const tz = new TimeZone("-05:00");
const ALL = { page: 1, perPage: 100 };
const fields = { description: "", durationMin: 30, price: 20000, imageUrl: null, active: true };
const weekdays = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startTime: "09:00", endTime: "19:00" }));

let repos: ReturnType<typeof memoryRepositories>;
let clock: FixedClock;
let admin: Barber;

beforeEach(() => {
  repos = memoryRepositories();
  clock = new FixedClock(tz.toInstant("2026-10-26", "08:00"));
  admin = repos.store.addBarber("Diego", { phone: "573001234567", passwordHash: "hash:diego1234", isAdmin: true });
});

describe("nombres sin repetir", () => {
  it("nameKey ignora mayúsculas, tildes y espacios de más", () => {
    assert.equal(nameKey("  Corte a  Máquina "), "corte a maquina");
    assert.equal(nameKey("ANDRÉS"), nameKey("andres"));
  });

  it("no deja crear un servicio con el nombre de otro, aunque esté oculto", async () => {
    repos.store.addService({ name: "Corte a máquina", durationMin: 30, price: 20000, active: false });
    const create = new CreateService(repos.services, clock);
    await assert.rejects(
      create.execute({ fields: { ...fields, name: "corte A MAQUINA" }, author: admin }),
      (e: ConflictError) => e instanceof ConflictError && e.code === ErrorCode.ServiceNameTaken,
    );
    assert.equal(repos.store.services.size, 1);
  });

  it("al editar se puede dejar el mismo nombre, pero no el de otro", async () => {
    const corte = repos.store.addService({ name: "Corte", durationMin: 30, price: 20000 });
    repos.store.addService({ name: "Barba", durationMin: 20, price: 10000 });
    const update = new UpdateService(repos.services, clock);
    await update.execute({ serviceId: corte.id, fields: { name: "Corte", price: 22000 }, author: admin });
    await assert.rejects(
      update.execute({ serviceId: corte.id, fields: { name: "barba" }, author: admin }),
      (e: ConflictError) => e.code === ErrorCode.ServiceNameTaken,
    );
    assert.equal(repos.store.services.get(corte.id)!.name, "Corte");
  });

  it("dos repetidos de antes de la regla se pueden editar y ocultar", async () => {
    const first = repos.store.addService({ name: "Corte a maquina", durationMin: 30, price: 20000 });
    repos.store.addService({ name: "Corte a maquina", durationMin: 30, price: 20000 });
    const update = new UpdateService(repos.services, clock);
    const hidden = await update.execute({ serviceId: first.id, fields: { name: "Corte a maquina", active: false }, author: admin });
    assert.equal(hidden.active, false);
  });
});

describe("barberos", () => {
  const create = () => new CreateBarber(repos.barbers, repos.clients, repos.transactions);
  const update = () => new UpdateBarber(repos.barbers, repos.clients);

  it("crea al barbero con su semana, activo y sin cuenta", async () => {
    const barber = await create().execute({ name: "Andrés", phone: "3004445566", schedules: weekdays });
    assert.equal(barber.phone, "573004445566");
    assert.equal(barber.active, true);
    assert.equal(barber.hasAccount, false);
    assert.deepEqual(
      barber.schedules.map((s) => s.weekday),
      [1, 2, 3, 4, 5, 6],
    );
    assert.equal(repos.store.barbers.get(barber.id)!.schedules.length, 6);
  });

  it("no repite nombre ni teléfono, tampoco el de un cliente con cuenta", async () => {
    await assert.rejects(create().execute({ name: "diégo", phone: null, schedules: [] }), (e: ConflictError) => e.code === ErrorCode.BarberNameTaken);
    await assert.rejects(
      create().execute({ name: "Otro", phone: "3001234567", schedules: [] }),
      (e: ConflictError) => e.code === ErrorCode.PhoneAlreadyRegistered,
    );
    repos.store.addClient({ name: "Ana", phone: "573109998877", registered: true, passwordHash: "hash:x" });
    await assert.rejects(
      create().execute({ name: "Otro", phone: "3109998877", schedules: [] }),
      (e: ConflictError) => e.code === ErrorCode.PhoneAlreadyRegistered,
    );
  });

  it("dos jornadas del mismo día no se pueden pisar", async () => {
    const barber = repos.store.addBarber("Andrés");
    await assert.rejects(
      update().execute(
        {
          barberId: barber.id,
          schedules: [
            { weekday: 1, startTime: "09:00", endTime: "13:00" },
            { weekday: 1, startTime: "12:00", endTime: "18:00" },
          ],
        },
        admin,
      ),
      (e: RuleViolationError) => e.code === ErrorCode.ScheduleOverlap,
    );
    // Partida en dos sin pisarse sí se puede
    const saved = await update().execute(
      {
        barberId: barber.id,
        schedules: [
          { weekday: 1, startTime: "09:00", endTime: "13:00" },
          { weekday: 1, startTime: "14:00", endTime: "18:00" },
        ],
      },
      admin,
    );
    assert.equal(saved.schedulesOn(1).length, 2);
    assert.equal(saved.schedulesOn(2).length, 0);
  });

  it("edita nombre y teléfono, y lo desactiva", async () => {
    const barber = repos.store.addBarber("Andrés", { phone: "573004445566" });
    const saved = await update().execute({ barberId: barber.id, name: "Andrés Felipe", phone: "3004445577", active: false }, admin);
    assert.equal(saved.name, "Andrés Felipe");
    assert.equal(saved.phone, "573004445577");
    assert.equal(saved.active, false);
    // Guardarse a sí mismo con el mismo nombre no cuenta como repetido
    await update().execute({ barberId: barber.id, name: "andres felipe" }, admin);
  });

  it("el admin no se puede desactivar a sí mismo", async () => {
    await assert.rejects(
      update().execute({ barberId: admin.id, active: false }, admin),
      (e: ForbiddenError) => e instanceof ForbiddenError && e.code === ErrorCode.OwnAccessLocked,
    );
    assert.equal(repos.store.barbers.get(admin.id)!.active, true);
  });

  it("con cuenta el teléfono no puede quedar vacío", async () => {
    const barber = repos.store.addBarber("Andrés", { phone: "573004445566", passwordHash: "hash:x" });
    await assert.rejects(update().execute({ barberId: barber.id, phone: null }, admin), RuleViolationError);
  });

  it("le da cuenta del panel como barbero, y sin teléfono no se puede", async () => {
    const give = new GiveBarberAccount(repos.barbers, fakeHasher);
    const withPhone = repos.store.addBarber("Andrés", { phone: "573004445566" });
    const saved = await give.execute({ barberId: withPhone.id, password: "andres1234" });
    assert.equal(saved.passwordHash, "hash:andres1234");
    assert.equal(saved.role, "BARBERO");
    const noPhone = repos.store.addBarber("Sin teléfono");
    await assert.rejects(give.execute({ barberId: noPhone.id, password: "clave1234" }), RuleViolationError);
    await assert.rejects(give.execute({ barberId: withPhone.id, password: "corta" }), (e: RuleViolationError) => e.code === ErrorCode.PasswordTooShort);
  });
});

describe("clientes", () => {
  it("lista con el número de citas y la última, y busca por nombre o teléfono", async () => {
    const service = repos.store.addService({ name: "Corte", durationMin: 30, price: 20000 });
    const create = new CreateAppointment(repos.services, repos.transactions, clock, tz, 10);
    const book = (name: string, phone: string, time: string, channel = BookingChannel.Panel) =>
      create.execute({
        serviceId: service.id,
        barberId: admin.id,
        start: tz.toInstant("2026-10-27", time),
        client: { name, phone, acceptsDataPolicy: true },
        channel,
      });
    await book("Laura", "3101112222", "09:00");
    await book("Laura", "3101112222", "11:00");
    await book("Pedro", "3203334444", "10:00");

    const list = new ListClients(repos.clients);
    const all = await list.execute({ page: ALL });
    assert.deepEqual(
      all.items.map((c) => [c.client.name, c.appointmentCount]),
      [
        ["Laura", 2],
        ["Pedro", 1],
      ],
    );
    assert.equal(all.items[0].lastAppointment!.start.getTime(), tz.toInstant("2026-10-27", "11:00").getTime());
    assert.equal((await list.execute({ search: "lau", page: ALL })).items.length, 1);
    assert.equal((await list.execute({ search: "320 333", page: ALL })).items[0].client.name, "Pedro");
    assert.equal((await list.execute({ search: "nadie", page: ALL })).total, 0);
  });
});

describe("vista previa del equipo", () => {
  it("con sesión del equipo la web no reserva", async () => {
    const service = repos.store.addService({ name: "Corte", durationMin: 30, price: 20000 });
    const create = new CreateAppointment(repos.services, repos.transactions, clock, tz, 10);
    await assert.rejects(
      create.execute({
        serviceId: service.id,
        start: tz.toInstant("2026-10-27", "09:00"),
        client: { name: "Diego", phone: "3001234567", acceptsDataPolicy: true },
        channel: BookingChannel.Web,
        sessionIsTeam: true,
      }),
      (e: ForbiddenError) => e instanceof ForbiddenError && e.code === ErrorCode.TeamPreviewOnly,
    );
    assert.equal(repos.store.appointments.size, 0);
  });
});
