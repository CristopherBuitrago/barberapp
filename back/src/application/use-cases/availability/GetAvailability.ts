import { NotFoundError } from "../../../domain/errors/DomainError.js";
import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { ServiceRepository } from "../../../domain/repositories/ServiceRepository.js";
import type { TimeBlockRepository } from "../../../domain/repositories/TimeBlockRepository.js";
import { findFreeSlots, type AvailableSlot } from "../../../domain/services/availability.js";
import { addMinutes, type TimeZone } from "../../../domain/value-objects/TimeZone.js";
import type { Clock } from "../../ports/Clock.js";

/** Margen para reservar: no se ofrecen horas que empiezan en menos de esto. */
const MIN_NOTICE_MIN = 15;

/**
 * Horas libres de un día para un servicio. Sin barbero junta las de todos y dice,
 * por cada hora, quiénes pueden atender.
 */
export class GetAvailability {
  constructor(
    private readonly services: ServiceRepository,
    private readonly barbers: BarberRepository,
    private readonly timeBlocks: TimeBlockRepository,
    private readonly appointments: AppointmentRepository,
    private readonly clock: Clock,
    private readonly timeZone: TimeZone,
    private readonly intervalMin: number,
  ) {}

  async execute(input: { serviceId: number; date: string; barberId?: number }): Promise<AvailableSlot[]> {
    const service = await this.services.findActiveById(input.serviceId);
    if (!service) throw new NotFoundError("Servicio no encontrado");

    const { from, to } = this.timeZone.dayRange(input.date);
    const barbers = await this.barbers.findActive(input.barberId);
    const ids = barbers.map((b) => b.id);
    const [blocks, appointments] = await Promise.all([
      this.timeBlocks.findOverlapping(from, to, ids),
      this.appointments.findScheduledOverlapping(from, to, ids),
    ]);

    return findFreeSlots({
      date: input.date,
      durationMin: service.durationMin,
      intervalMin: this.intervalMin,
      earliestStart: addMinutes(this.clock.now(), MIN_NOTICE_MIN),
      timeZone: this.timeZone,
      barbers: barbers.map((barber) => ({
        barber,
        busy: [...blocks, ...appointments].filter((busy) => busy.barber.equals(barber)),
      })),
    });
  }
}
