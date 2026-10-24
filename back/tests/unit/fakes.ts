/**
 * Repositorios en memoria y dobles de los puertos para probar los casos de uso sin
 * base de datos. Implementan las mismas interfaces del dominio que los de Prisma.
 */
import type { Clock } from "../../src/application/ports/Clock.js";
import type { PasswordHasher } from "../../src/application/ports/PasswordHasher.js";
import type { TokenService } from "../../src/application/ports/TokenService.js";
import type { TransactionalRepositories, TransactionRunner } from "../../src/application/ports/TransactionRunner.js";
import { AppointmentStatus, type Appointment, type AppointmentDetail } from "../../src/domain/entities/Appointment.js";
import type { Barber, BarberWithSchedules, WorkSchedule } from "../../src/domain/entities/Barber.js";
import type { Client } from "../../src/domain/entities/Client.js";
import type { Image } from "../../src/domain/entities/Image.js";
import type { Service, ServiceData, ServiceWithAuthors } from "../../src/domain/entities/Service.js";
import type { SessionOwner } from "../../src/domain/entities/Session.js";
import type { TimeBlock, TimeBlockWithBarber } from "../../src/domain/entities/TimeBlock.js";
import type { AppointmentRepository, NewAppointment } from "../../src/domain/repositories/AppointmentRepository.js";
import type { BarberRepository, WorkScheduleRepository } from "../../src/domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../src/domain/repositories/ClientRepository.js";
import type { ImageRepository } from "../../src/domain/repositories/ImageRepository.js";
import type { ServiceRepository } from "../../src/domain/repositories/ServiceRepository.js";
import type { SessionRepository, SessionWithOwner } from "../../src/domain/repositories/SessionRepository.js";
import type { TimeBlockRepository } from "../../src/domain/repositories/TimeBlockRepository.js";
import { overlaps } from "../../src/domain/value-objects/TimeZone.js";

/** Todo lo guardado en memoria, compartido por los repositorios. */
export class Store {
  barbers: Barber[] = [];
  schedules: WorkSchedule[] = [];
  clients: Client[] = [];
  services: Service[] = [];
  appointments: Appointment[] = [];
  timeBlocks: TimeBlock[] = [];
  sessions: { id: number; tokenHash: string; clientId: number | null; barberId: number | null; expiresAt: Date }[] = [];
  images: Image[] = [];
  private seq = 0;

  nextId(): number {
    return ++this.seq;
  }

  addBarber(data: Partial<Barber> & { name: string }, schedule?: { startTime: string; endTime: string }): Barber {
    const barber: Barber = { id: this.nextId(), phone: null, active: true, passwordHash: null, isAdmin: false, ...data };
    this.barbers.push(barber);
    if (schedule) {
      for (let weekday = 0; weekday < 7; weekday++) {
        this.schedules.push({ id: this.nextId(), barberId: barber.id, weekday, ...schedule });
      }
    }
    return barber;
  }

  addService(data: Partial<Service> & { name: string; durationMin: number; price: number }): Service {
    const now = new Date(0);
    const service: Service = {
      id: this.nextId(),
      description: "",
      imageUrl: null,
      active: true,
      createdById: null,
      updatedById: null,
      createdAt: now,
      updatedAt: now,
      ...data,
    };
    this.services.push(service);
    return service;
  }

  addClient(data: Partial<Client> & { name: string; phone: string }): Client {
    const client: Client = {
      id: this.nextId(),
      birthDate: null,
      registered: false,
      acceptsDataPolicy: false,
      welcomeDiscountUsed: false,
      passwordHash: null,
      createdAt: new Date(0),
      ...data,
    };
    this.clients.push(client);
    return client;
  }

  detail(appointment: Appointment): AppointmentDetail {
    const barber = this.barbers.find((b) => b.id === appointment.barberId)!;
    const service = this.services.find((s) => s.id === appointment.serviceId)!;
    const client = this.clients.find((c) => c.id === appointment.clientId)!;
    return {
      ...appointment,
      barber: { id: barber.id, name: barber.name },
      service: { id: service.id, name: service.name, durationMin: service.durationMin },
      client: { id: client.id, name: client.name, phone: client.phone },
    };
  }
}

export class MemoryBarberRepository implements BarberRepository {
  constructor(private readonly store: Store) {}
  async findActive(barberId?: number) {
    return this.store.barbers.filter((b) => b.active && (!barberId || b.id === barberId));
  }
  async findAllWithSchedules(): Promise<BarberWithSchedules[]> {
    return this.store.barbers.map((b) => ({ ...b, schedules: this.store.schedules.filter((s) => s.barberId === b.id) }));
  }
  async findActiveByPhone(phone: string) {
    return this.store.barbers.find((b) => b.active && b.phone === phone) ?? null;
  }
  async existsWithPhone(phone: string) {
    return this.store.barbers.some((b) => b.phone === phone);
  }
  async findByName(name: string) {
    return this.store.barbers.find((b) => b.name.toLowerCase() === name.toLowerCase()) ?? null;
  }
  async updateName(id: number, name: string) {
    const barber = this.store.barbers.find((b) => b.id === id)!;
    barber.name = name;
    return barber;
  }
  async setAccount(id: number, data: { phone: string; passwordHash: string; isAdmin: boolean }) {
    const barber = this.store.barbers.find((b) => b.id === id)!;
    Object.assign(barber, data);
    return barber;
  }
}

export class MemoryWorkScheduleRepository implements WorkScheduleRepository {
  constructor(private readonly store: Store) {}
  async findByWeekday(weekday: number, barberIds: number[]) {
    return this.store.schedules.filter((s) => s.weekday === weekday && barberIds.includes(s.barberId));
  }
}

export class MemoryClientRepository implements ClientRepository {
  constructor(private readonly store: Store) {}
  async findByPhone(phone: string) {
    return this.store.clients.find((c) => c.phone === phone) ?? null;
  }
  async upsertForBooking(data: { phone: string; name: string; acceptsDataPolicy: boolean }) {
    const existing = await this.findByPhone(data.phone);
    if (!existing) return this.store.addClient({ ...data });
    existing.name = data.name;
    if (data.acceptsDataPolicy) existing.acceptsDataPolicy = true;
    return existing;
  }
  async saveRegistration(data: { phone: string; name: string; passwordHash: string; birthDate: Date | null }) {
    const fields = { ...data, registered: true, acceptsDataPolicy: true };
    const existing = await this.findByPhone(data.phone);
    if (!existing) return this.store.addClient(fields);
    return Object.assign(existing, fields);
  }
  async updateProfile(id: number, data: { name: string; birthDate?: Date | null }) {
    const client = this.store.clients.find((c) => c.id === id)!;
    client.name = data.name;
    if (data.birthDate !== undefined) client.birthDate = data.birthDate;
    return client;
  }
  async markWelcomeDiscountUsed(id: number) {
    this.store.clients.find((c) => c.id === id)!.welcomeDiscountUsed = true;
  }
}

export class MemoryServiceRepository implements ServiceRepository {
  constructor(private readonly store: Store) {}
  private withAuthors(s: Service): ServiceWithAuthors {
    const summary = (id: number | null) => {
      const b = this.store.barbers.find((x) => x.id === id);
      return b ? { id: b.id, name: b.name } : null;
    };
    return { ...s, createdBy: summary(s.createdById), updatedBy: summary(s.updatedById) };
  }
  async findActive() {
    return this.store.services.filter((s) => s.active);
  }
  async findActiveById(id: number) {
    return this.store.services.find((s) => s.id === id && s.active) ?? null;
  }
  async findAllWithAuthors() {
    return this.store.services.map((s) => this.withAuthors(s));
  }
  async exists(id: number) {
    return this.store.services.some((s) => s.id === id);
  }
  async create(data: ServiceData, authorId: number) {
    return this.withAuthors(this.store.addService({ ...data, createdById: authorId, updatedById: authorId }));
  }
  async update(id: number, data: Partial<ServiceData>, authorId: number) {
    const service = this.store.services.find((s) => s.id === id)!;
    for (const [key, value] of Object.entries(data)) if (value !== undefined) Object.assign(service, { [key]: value });
    service.updatedById = authorId;
    return this.withAuthors(service);
  }
}

export class MemoryAppointmentRepository implements AppointmentRepository {
  constructor(private readonly store: Store) {}
  async create(data: NewAppointment) {
    const appointment: Appointment = {
      ...data,
      id: this.store.nextId(),
      status: AppointmentStatus.Scheduled,
      createdAt: new Date(0),
    };
    this.store.appointments.push(appointment);
    return this.store.detail(appointment);
  }
  async findDetailById(id: number) {
    const a = this.store.appointments.find((x) => x.id === id);
    return a ? this.store.detail(a) : null;
  }
  async exists(id: number) {
    return this.store.appointments.some((a) => a.id === id);
  }
  async updateStatus(id: number, status: Appointment["status"]) {
    const a = this.store.appointments.find((x) => x.id === id)!;
    a.status = status;
    return this.store.detail(a);
  }
  async reschedule(id: number, start: Date, end: Date) {
    const a = this.store.appointments.find((x) => x.id === id)!;
    Object.assign(a, { start, end });
    return this.store.detail(a);
  }
  async findUpcomingByClientPhone(phone: string, now: Date) {
    const client = this.store.clients.find((c) => c.phone === phone);
    return this.store.appointments
      .filter((a) => a.clientId === client?.id && a.status === AppointmentStatus.Scheduled && a.end > now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((a) => this.store.detail(a));
  }
  async findActiveByClient(clientId: number, now: Date) {
    return (
      this.store.appointments.find(
        (a) => a.clientId === clientId && a.status === AppointmentStatus.Scheduled && a.end > now,
      ) ?? null
    );
  }
  async findStartingBetween(from: Date, to: Date, barberId?: number) {
    return this.store.appointments
      .filter((a) => a.start >= from && a.start < to && (!barberId || a.barberId === barberId))
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((a) => this.store.detail(a));
  }
  async findScheduledOverlapping(from: Date, to: Date, barberIds: number[], excludeId?: number) {
    return this.store.appointments.filter(
      (a) =>
        barberIds.includes(a.barberId) &&
        a.status === AppointmentStatus.Scheduled &&
        overlaps(a.start, a.end, from, to) &&
        a.id !== excludeId,
    );
  }
}

export class MemoryTimeBlockRepository implements TimeBlockRepository {
  constructor(private readonly store: Store) {}
  async create(data: { barberId: number; start: Date; end: Date; reason: string }) {
    const block = { id: this.store.nextId(), ...data };
    this.store.timeBlocks.push(block);
    return block;
  }
  async findOverlapping(from: Date, to: Date, barberIds: number[]) {
    return this.store.timeBlocks.filter((b) => barberIds.includes(b.barberId) && overlaps(b.start, b.end, from, to));
  }
  async findOverlappingWithBarber(from: Date, to: Date): Promise<TimeBlockWithBarber[]> {
    return this.store.timeBlocks
      .filter((b) => overlaps(b.start, b.end, from, to))
      .map((b) => {
        const barber = this.store.barbers.find((x) => x.id === b.barberId)!;
        return { ...b, barber: { id: barber.id, name: barber.name } };
      });
  }
  async delete(id: number) {
    const before = this.store.timeBlocks.length;
    this.store.timeBlocks = this.store.timeBlocks.filter((b) => b.id !== id);
    return this.store.timeBlocks.length < before;
  }
}

export class MemorySessionRepository implements SessionRepository {
  constructor(private readonly store: Store) {}
  async create(owner: SessionOwner, tokenHash: string, expiresAt: Date) {
    this.store.sessions.push({
      id: this.store.nextId(),
      tokenHash,
      expiresAt,
      clientId: "clientId" in owner ? owner.clientId : null,
      barberId: "barberId" in owner ? owner.barberId : null,
    });
  }
  async findByTokenHash(tokenHash: string): Promise<SessionWithOwner | null> {
    const s = this.store.sessions.find((x) => x.tokenHash === tokenHash);
    if (!s) return null;
    return {
      ...s,
      client: this.store.clients.find((c) => c.id === s.clientId) ?? null,
      barber: this.store.barbers.find((b) => b.id === s.barberId) ?? null,
    };
  }
  async delete(id: number) {
    this.store.sessions = this.store.sessions.filter((s) => s.id !== id);
  }
}

export class MemoryImageRepository implements ImageRepository {
  constructor(private readonly store: Store) {}
  async create(type: string, data: Uint8Array) {
    const image = { id: this.store.nextId(), type, data, createdAt: new Date(0) };
    this.store.images.push(image);
    return image;
  }
  async findById(id: number) {
    return this.store.images.find((i) => i.id === id) ?? null;
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
    schedules: new MemoryWorkScheduleRepository(store),
    timeBlocks: new MemoryTimeBlockRepository(store),
    services: new MemoryServiceRepository(store),
    sessions: new MemorySessionRepository(store),
    images: new MemoryImageRepository(store),
  };
  return { store, ...repos, transactions: new MemoryTransactionRunner(repos) };
}
