import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../../domain/repositories/ClientRepository.js";
import { normalizePhone } from "../../../domain/value-objects/PhoneNumber.js";
import type { Contact } from "../../dtos/contacts.js";
import type { Clock } from "../../ports/Clock.js";

/**
 * Para el agente de WhatsApp: quién está escribiendo. Si es del equipo lo atiende en
 * modo barbero, si no es un cliente y le pasa sus próximas citas.
 */
export class IdentifyContact {
  constructor(
    private readonly barbers: BarberRepository,
    private readonly clients: ClientRepository,
    private readonly appointments: AppointmentRepository,
    private readonly clock: Clock,
    private readonly welcomeDiscountPct: number,
  ) {}

  async execute(rawPhone: string): Promise<Contact> {
    const phone = normalizePhone(rawPhone);
    const barber = await this.barbers.findActiveByPhone(phone);
    if (barber) return { kind: "barber", barber };

    const client = await this.clients.findByPhone(phone);
    return {
      kind: "client",
      client,
      pendingDiscountPct: client?.hasPendingWelcomeDiscount ? this.welcomeDiscountPct : 0,
      upcomingAppointments: await this.appointments.findUpcomingByClientPhone(phone, this.clock.now()),
    };
  }
}
