/**
 * Repositorios en memoria y dobles de los puertos para probar los casos de uso sin
 * base de datos. Implementan las mismas interfaces del dominio que los de Prisma.
 * Guardan y entregan copias, así una prueba se da cuenta si a un caso de uso se le
 * olvida llamar save().
 */
import type { Clock } from "../../src/application/ports/Clock.js";
import type { PasswordHasher } from "../../src/application/ports/PasswordHasher.js";
import type { TokenService } from "../../src/application/ports/TokenService.js";
import type { TransactionalRepositories, TransactionRunner } from "../../src/application/ports/TransactionRunner.js";
import { Appointment } from "../../src/domain/entities/Appointment.js";
import { Barber } from "../../src/domain/entities/Barber.js";
import { Client } from "../../src/domain/entities/Client.js";
import { Image } from "../../src/domain/entities/Image.js";
import { Service } from "../../src/domain/entities/Service.js";
import { Session } from "../../src/domain/entities/Session.js";
import { TimeBlock } from "../../src/domain/entities/TimeBlock.js";
import { WorkSchedule } from "../../src/domain/entities/WorkSchedule.js";
import type { AppointmentRepository } from "../../src/domain/repositories/AppointmentRepository.js";
import type { BarberRepository } from "../../src/domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../src/domain/repositories/ClientRepository.js";
import type { ImageRepository } from "../../src/domain/repositories/ImageRepository.js";
import type { ServiceRepository } from "../../src/domain/repositories/ServiceRepository.js";
import type { SessionRepository } from "../../src/domain/repositories/SessionRepository.js";
import type { TimeBlockRepository } from "../../src/domain/repositories/TimeBlockRepository.js";
import { paginate, type PageRequest } from "../../src/domain/repositories/Pagination.js";
import { overlaps } from "../../src/domain/value-objects/TimeZone.js";

// --- Copias de cada entidad con un id ---

function copyBarber(b: Barber, id: number): Barber {
  return Barber.restore(id, {
    name: b.name,
    phone: b.phone,
    active: b.active,
    passwordHash: b.passwordHash,
    isAdmin: b.isAdmin,
    schedules: [...b.schedules],
  });
}

function copyClient(c: Client, id: number): Client {
  return Client.restore(id, {
    name: c.name,
    phone: c.phone,
    birthDate: c.birthDate,
    registered: c.registered,
    acceptsDataPolicy: c.acceptsDataPolicy,
    welcomeDiscountUsed: c.welcomeDiscountUsed,
    passwordHash: c.passwordHash,
    createdAt: c.createdAt,
  });
}

function copyService(s: Service, id: number): Service {
  return Service.restore(id, {
    name: s.name,
    description: s.description,
    durationMin: s.durationMin,
    price: s.price,
    imageUrl: s.imageUrl,
    active: s.active,
    createdBy: s.createdBy,
    updatedBy: s.updatedBy,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  });
}

function copyAppointment(a: Appointment, id: number): Appointment {
  return Appointment.restore(id, {
    client: a.client,
    barber: a.barber,
    service: a.service,
    start: a.start,
    end: a.end,
    status: a.status,
    channel: a.channel,
    price: a.price,
    discountPct: a.discountPct,
    notes: a.notes,
    createdAt: a.createdAt,
  });
}

function copyTimeBlock(t: TimeBlock, id: number): TimeBlock {
  return TimeBlock.restore(id, { barber: t.barber, start: t.start, end: t.end, reason: t.reason });
}

/** Todo lo guardado en memoria, compartido por los repositorios. */
export class Store {
  barbers = new Map<number, Barber>();
  clients = new Map<number, Client>();
  services = new Map<number, Service>();
  appointments = new Map<number, Appointment>();
  timeBlocks = new Map<number, TimeBlock>();
  sessions = new Map<number, Session>();
  images = new Map<number, Image>();
  private seq = 0;

  nextId(): number {
    return ++this.seq;
  }

  /** Un barbero que trabaja todos los días en ese horario */
  addBarber(name: string, options: { phone?: string; passwordHash?: string; isAdmin?: boolean; active?: boolean; hours?: [string, string] } = {}): Barber {
    const id = this.nextId();
    const [startTime, endTime] = options.hours ?? ["09:00", "18:00"];
    const schedules = Array.from({ length: 7 }, (_, weekday) =>
      WorkSchedule.restore(this.nextId(), { barberId: id, weekday, startTime, endTime }),
    );
    const barber = Barber.restore(id, {
      name,
      phone: options.phone ?? null,
      active: options.active ?? true,
      passwordHash: options.passwordHash ?? null,
      isAdmin: options.isAdmin ?? false,
      schedules,
    });
    this.barbers.set(id, barber);
    return copyBarber(barber, id);
  }

  addClient(data: { name: string; phone: string; registered?: boolean; passwordHash?: string; welcomeDiscountUsed?: boolean }): Client {
    const id = this.nextId();
    const client = Client.restore(id, {
      name: data.name,
      phone: data.phone,
      birthDate: null,
      registered: data.registered ?? false,
      acceptsDataPolicy: false,
      welcomeDiscountUsed: data.welcomeDiscountUsed ?? false,
      passwordHash: data.passwordHash ?? null,
      createdAt: new Date(0),
    });
    this.clients.set(id, client);
    return copyClient(client, id);
  }

  addService(data: { name: string; durationMin: number; price: number; active?: boolean }): Service {
    const id = this.nextId();
    const service = Service.restore(id, {
      description: "",
      imageUrl: null,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      active: true,
      ...data,
    });
    this.services.set(id, service);
    return copyService(service, id);
  }
}

/** Guarda una copia: si es nueva le pone id */
function persist<T extends { isNew: boolean; id: number }>(
  map: Map<number, T>,
  entity: T,
  copy: (e: T, id: number) => T,
  nextId: () => number,
): T {
  const id = entity.isNew ? nextId() : entity.id;
  map.set(id, copy(entity, id));
  return copy(entity, id);
}

export class MemoryBarberRepository implements BarberRepository {
  constructor(private readonly store: Store) {}
  private all() {
    return [...this.store.barbers.values()].map((b) => copyBarber(b, b.id));
  }
  async findActive(barberId?: number) {
    return this.all().filter((b) => b.active && (!barberId || b.id === barberId));
  }
  async findAll() {
    return this.all();
  }
  async listAll(page: PageRequest) {
    return paginate(this.all(), page);
  }
  async findById(id: number) {
    return this.all().find((b) => b.id === id) ?? null;
  }
  async findActiveByPhone(phone: string) {
    return this.all().find((b) => b.active && b.phone === phone) ?? null;
  }
  async existsWithPhone(phone: string) {
    return this.all().some((b) => b.phone === phone);
  }
  async findByName(name: string) {
    return this.all().find((b) => b.name.toLowerCase() === name.toLowerCase()) ?? null;
  }
  async save(barber: Barber) {
    return persist(this.store.barbers, barber, copyBarber, () => this.store.nextId());
  }
}

export class MemoryClientRepository implements ClientRepository {
  constructor(private readonly store: Store) {}
  async findByPhone(phone: string) {
    const c = [...this.store.clients.values()].find((x) => x.phone === phone);
    return c ? copyClient(c, c.id) : null;
  }
  async save(client: Client) {
    return persist(this.store.clients, client, copyClient, () => this.store.nextId());
  }
}

export class MemoryServiceRepository implements ServiceRepository {
  constructor(private readonly store: Store) {}
  private all() {
    return [...this.store.services.values()].map((s) => copyService(s, s.id));
  }
  async findActive(page: PageRequest) {
    return paginate(this.all().filter((s) => s.active), page);
  }
  async findActiveById(id: number) {
    return this.all().find((s) => s.id === id && s.active) ?? null;
  }
  async findAll(page: PageRequest) {
    return paginate(this.all(), page);
  }
  async findById(id: number) {
    return this.all().find((s) => s.id === id) ?? null;
  }
  async save(service: Service) {
    return persist(this.store.services, service, copyService, () => this.store.nextId());
  }
}

export class MemoryAppointmentRepository implements AppointmentRepository {
  constructor(private readonly store: Store) {}
  private all() {
    return [...this.store.appointments.values()]
      .map((a) => copyAppointment(a, a.id))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }
  async findById(id: number) {
    return this.all().find((a) => a.id === id) ?? null;
  }
  async save(appointment: Appointment) {
    return persist(this.store.appointments, appointment, copyAppointment, () => this.store.nextId());
  }
  async findUpcomingByClientPhone(phone: string, now: Date) {
    return this.all().filter((a) => a.client.phone === phone && a.isActiveAt(now));
  }
  async findActiveByClient(client: Client, now: Date) {
    return this.all().find((a) => a.client.equals(client) && a.isActiveAt(now)) ?? null;
  }
  async findStartingBetween(from: Date, to: Date, filter: { barberId?: number; excludeCancelled?: boolean }, page: PageRequest) {
    const found = this.all().filter(
      (a) =>
        a.start >= from &&
        a.start < to &&
        (!filter.barberId || a.barber.id === filter.barberId) &&
        (!filter.excludeCancelled || a.status !== "CANCELADA"),
    );
    return paginate(found, page);
  }
  async findScheduledOverlapping(from: Date, to: Date, barberIds: number[], excludeId?: number) {
    return this.all().filter(
      (a) => barberIds.includes(a.barber.id) && a.isScheduled && overlaps(a.start, a.end, from, to) && a.id !== excludeId,
    );
  }
}

export class MemoryTimeBlockRepository implements TimeBlockRepository {
  constructor(private readonly store: Store) {}
  private all() {
    return [...this.store.timeBlocks.values()].map((t) => copyTimeBlock(t, t.id));
  }
  async findById(id: number) {
    return this.all().find((t) => t.id === id) ?? null;
  }
  async findOverlapping(from: Date, to: Date, barberIds?: number[]) {
    return this.all().filter((t) => (!barberIds || barberIds.includes(t.barber.id)) && overlaps(t.start, t.end, from, to));
  }
  async listOverlapping(from: Date, to: Date, page: PageRequest) {
    return paginate(await this.findOverlapping(from, to), page);
  }
  async save(block: TimeBlock) {
    return persist(this.store.timeBlocks, block, copyTimeBlock, () => this.store.nextId());
  }
  async delete(block: TimeBlock) {
    this.store.timeBlocks.delete(block.id);
  }
}

export class MemorySessionRepository implements SessionRepository {
  constructor(private readonly store: Store) {}
  async findByTokenHash(tokenHash: string) {
    const s = [...this.store.sessions.values()].find((x) => x.tokenHash === tokenHash);
    if (!s) return null;
    // El dueño se trae como esté guardado ahora, igual que hace la base
    const owner = s.client ? this.store.clients.get(s.client.id)! : this.store.barbers.get(s.barber!.id)!;
    return Session.restore(s.id, { tokenHash: s.tokenHash, owner, expiresAt: s.expiresAt });
  }
  async save(session: Session) {
    const copy = (x: Session, id: number) =>
      Session.restore(id, { tokenHash: x.tokenHash, owner: x.owner, expiresAt: x.expiresAt });
    return persist(this.store.sessions, session, copy, () => this.store.nextId());
  }
  async delete(session: Session) {
    this.store.sessions.delete(session.id);
  }
}

export class MemoryImageRepository implements ImageRepository {
  constructor(private readonly store: Store) {}
  async findById(id: number) {
    return this.store.images.get(id) ?? null;
  }
  async save(image: Image) {
    const copy = (x: Image, id: number) => Image.restore(id, { type: x.type, data: x.data, createdAt: x.createdAt });
    return persist(this.store.images, image, copy, () => this.store.nextId());
  }
}

/** En memoria no hay transacciones de verdad, el trabajo corre directo sobre el mismo store. */
export class MemoryTransactionRunner implements TransactionRunner {
  constructor(private readonly repos: TransactionalRepositories) {}
  run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T> {
    return work(this.repos);
  }
}

export class FixedClock implements Clock {
  constructor(public current: Date) {}
  now() {
    return this.current;
  }
}

/** Hash de mentiras, alcanza para probar la lógica sin gastar tiempo en scrypt. */
export const fakeHasher: PasswordHasher = {
  async hash(password) {
    return `hash:${password}`;
  },
  async verify(password, storedHash) {
    return storedHash === `hash:${password}`;
  },
};

export class CountingTokens implements TokenService {
  private count = 0;
  generate() {
    const token = `token-${++this.count}`;
    return { token, tokenHash: this.hash(token) };
  }
  hash(token: string) {
    return `sha:${token}`;
  }
}

/** Todos los repositorios en memoria sobre un mismo store. */
export function memoryRepositories(store = new Store()) {
  const repos = {
    appointments: new MemoryAppointmentRepository(store),
    barbers: new MemoryBarberRepository(store),
    clients: new MemoryClientRepository(store),
    timeBlocks: new MemoryTimeBlockRepository(store),
    services: new MemoryServiceRepository(store),
    sessions: new MemorySessionRepository(store),
    images: new MemoryImageRepository(store),
  };
  return { store, ...repos, transactions: new MemoryTransactionRunner(repos) };
}
