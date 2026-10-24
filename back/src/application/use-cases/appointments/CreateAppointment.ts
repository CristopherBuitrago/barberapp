import { BookingChannel, type AppointmentDetail } from "../../../domain/entities/Appointment.js";
import { hasPendingWelcomeDiscount } from "../../../domain/entities/Client.js";
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

  async execute(input: CreateAppointmentInput): Promise<AppointmentDetail> {
    const isWeb = input.channel === BookingChannel.Web;
    // Con sesión de cliente la cita es suya, se usan su nombre y su teléfono y no los del formulario
    const client =
      isWeb && input.sessionClient
        ? { name: input.sessionClient.name, phone: input.sessionClient.phone, acceptsDataPolicy: true }
        : input.client;
    if (isWeb && !client.acceptsDataPolicy) {
      throw new RuleViolationError("Debes aceptar el tratamiento de datos personales");
    }

    const service = await this.services.findActiveById(input.serviceId);
    if (!service) throw new NotFoundError("Servicio no encontrado");

    const start = input.start;
    const end = addMinutes(start, service.durationMin);
    if (start < this.clock.now()) throw new RuleViolationError("Esa hora ya pasó");
    const phone = normalizePhone(client.phone);

    return this.transactions.run(async (repos) => {
      const barberId = await this.pickBarber(repos, input.barberId, start, end);

      const saved = await repos.clients.upsertForBooking({
        phone,
        name: client.name,
        acceptsDataPolicy: client.acceptsDataPolicy ?? false,
      });

      // Cada cliente puede tener una sola cita activa. El panel sí puede agendarle varias
      if (input.channel !== BookingChannel.Panel) {
        const active = await repos.appointments.findActiveByClient(saved.id, this.clock.now());
        if (active) {
          throw new ConflictError("Ya tienes una cita agendada. Cancélala o espera a que pase para reservar otra.");
        }
      }

      // El descuento de bienvenida se gasta en la primera cita después de registrarse
      let discountPct = 0;
      if (hasPendingWelcomeDiscount(saved)) {
        discountPct = this.welcomeDiscountPct;
        await repos.clients.markWelcomeDiscountUsed(saved.id);
      }

      return repos.appointments.create({
        clientId: saved.id,
        barberId,
        serviceId: service.id,
        start,
        end,
        channel: input.channel,
        price: service.price,
        discountPct,
        notes: input.notes ?? "",
      });
    });
  }

  /** El barbero que pidieron si está libre, o si no pidieron ninguno el primero que lo esté. */
  private async pickBarber(
    repos: TransactionalRepositories,
    barberId: number | undefined,
    start: Date,
    end: Date,
  ): Promise<number> {
    if (barberId) {
      if (!(await isBarberFree(repos, this.timeZone, barberId, start, end))) {
        throw new ConflictError("Esa hora ya no está disponible con ese barbero");
      }
      return barberId;
    }
    for (const barber of await repos.barbers.findActive()) {
      if (await isBarberFree(repos, this.timeZone, barber.id, start, end)) return barber.id;
    }
    throw new ConflictError("Esa hora ya no está disponible");
  }
}
