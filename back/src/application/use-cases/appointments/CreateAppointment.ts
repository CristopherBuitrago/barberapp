import { ErrorCode } from "../../../domain/errors/ErrorCode.js";
import { Appointment, BookingChannel } from "../../../domain/entities/Appointment.js";
import type { Barber } from "../../../domain/entities/Barber.js";
import { Client } from "../../../domain/entities/Client.js";
import { ConflictError, NotFoundError, RuleViolationError } from "../../../domain/errors/DomainError.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";
import { normalizePhone } from "../../../domain/value-objects/PhoneNumber.js";
import { addMinutes, type TimeZone } from "../../../domain/value-objects/TimeZone.js";
import type { CreateAppointmentInput } from "../../dtos/appointments.js";
import type { Clock } from "../../ports/Clock.js";
import type { TransactionalRepositories, TransactionRunner } from "../../ports/TransactionRunner.js";
import { isBarberFree } from "./barberAvailability.js";

/** Agenda una cita desde la web, WhatsApp o el panel. */
export class CreateAppointment {
  constructor(
    private readonly services: ServiceRepository,
    private readonly transactions: TransactionRunner,
    private readonly clock: Clock,
    private readonly timeZone: TimeZone,
    private readonly welcomeDiscountPct: number,
  ) {}

  async execute(input: CreateAppointmentInput): Promise<Appointment> {
    const isWeb = input.channel === BookingChannel.Web;
    // Con sesión de cliente la cita es suya, se usan su nombre y su teléfono y no los del formulario
    const contact =
      isWeb && input.sessionClient
        ? { name: input.sessionClient.name, phone: input.sessionClient.phone, acceptsDataPolicy: true }
        : input.client;
    if (isWeb && !contact.acceptsDataPolicy) {
      throw new RuleViolationError("Debes aceptar el tratamiento de datos personales", ErrorCode.DataPolicyRequired);
    }

    const service = await this.services.findActiveById(input.serviceId);
    if (!service) throw new NotFoundError("Servicio no encontrado", ErrorCode.ServiceNotFound);

    const start = input.start;
    const end = addMinutes(start, service.durationMin);
    if (start < this.clock.now()) throw new RuleViolationError("Esa hora ya pasó", ErrorCode.TimeInPast);

    return this.transactions.run(async (repos) => {
      const barber = await this.pickBarber(repos, input.barberId, start, end);
      let client = await this.findOrCreateClient(repos, contact);

      // Cada cliente puede tener una sola cita activa. El panel sí puede agendarle varias
      if (input.channel !== BookingChannel.Panel) {
        const active = await repos.appointments.findActiveByClient(client, this.clock.now());
        if (active) {
          throw new ConflictError("Ya tienes una cita agendada. Cancélala o espera a que pase para reservar otra.", ErrorCode.ActiveAppointmentExists);
        }
      }

      // El descuento de bienvenida se gasta en la primera cita después de registrarse
      const discountPct = client.useWelcomeDiscount(this.welcomeDiscountPct);
      if (discountPct > 0) client = await repos.clients.save(client);

      const appointment = Appointment.schedule(
        { client, barber, service, start, channel: input.channel, discountPct, notes: input.notes },
        this.clock.now(),
      );
      return repos.appointments.save(appointment);
    });
  }

  /** El cliente de ese teléfono con el nombre al día, o uno nuevo si es la primera vez que reserva */
  private async findOrCreateClient(
    repos: TransactionalRepositories,
    contact: { name: string; phone: string; acceptsDataPolicy?: boolean },
  ): Promise<Client> {
    const existing = await repos.clients.findByPhone(normalizePhone(contact.phone));
    if (!existing) {
      return repos.clients.save(Client.create(contact, this.clock.now()));
    }
    existing.name = contact.name;
    // La autorización solo se marca, si no la manda ahora se queda como estaba
    if (contact.acceptsDataPolicy) existing.acceptsDataPolicy = true;
    return repos.clients.save(existing);
  }

  /** El barbero que pidieron si está libre, o si no pidieron ninguno el primero que lo esté. */
  private async pickBarber(
    repos: TransactionalRepositories,
    barberId: number | undefined,
    start: Date,
    end: Date,
  ): Promise<Barber> {
    if (barberId) {
      const barber = await repos.barbers.findById(barberId);
      if (!barber || !(await isBarberFree(repos, this.timeZone, barber, start, end))) {
        throw new ConflictError("Esa hora ya no está disponible con ese barbero", ErrorCode.SlotTaken);
      }
      return barber;
    }
    for (const barber of await repos.barbers.findActive()) {
      if (await isBarberFree(repos, this.timeZone, barber, start, end)) return barber;
    }
    throw new ConflictError("Esa hora ya no está disponible", ErrorCode.SlotTaken);
  }
}
