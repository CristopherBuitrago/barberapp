/**
 * Arma el JSON que responde la API. Por dentro todo está en inglés, pero el front y el
 * agente esperan los campos en español y las fechas en hora local, y eso no cambia.
 */
import type { Contact } from "../../../application/dtos/contacts.js";
import type { Profile } from "../../../application/dtos/accounts.js";
import type { Appointment } from "../../../domain/entities/Appointment.js";
import type { Barber } from "../../../domain/entities/Barber.js";
import type { Service } from "../../../domain/entities/Service.js";
import type { TimeBlock } from "../../../domain/entities/TimeBlock.js";
import type { AvailableSlot } from "../../../domain/services/availability.js";
import type { TimeZone } from "../../../domain/value-objects/TimeZone.js";

export class ApiPresenter {
  constructor(private readonly timeZone: TimeZone) {}

  barber(barber: Barber) {
    return { id: barber.id, nombre: barber.name };
  }

  /** Para el panel. La contraseña nunca sale, ni siquiera su hash */
  teamMember(barber: Barber) {
    return {
      id: barber.id,
      nombre: barber.name,
      telefono: barber.phone,
      activo: barber.active,
      esAdmin: barber.isAdmin,
      horarios: barber.schedules.map((s) => ({
        id: s.id,
        barberoId: s.barberId,
        diaSemana: s.weekday,
        horaInicio: s.startTime,
        horaFin: s.endTime,
      })),
    };
  }

  service(service: Service) {
    return {
      id: service.id,
      nombre: service.name,
      descripcion: service.description,
      duracionMin: service.durationMin,
      precio: service.price,
      imagenUrl: service.imageUrl,
      activo: service.active,
      creadoPorId: service.createdBy?.id ?? null,
      actualizadoPorId: service.updatedBy?.id ?? null,
      creadoEn: service.createdAt,
      actualizadoEn: service.updatedAt,
    };
  }

  serviceForAdmin(service: Service) {
    return {
      ...this.service(service),
      creadoPor: service.createdBy && this.barber(service.createdBy),
      actualizadoPor: service.updatedBy && this.barber(service.updatedBy),
    };
  }

  appointment(appointment: Appointment) {
    return {
      id: appointment.id,
      inicio: this.timeZone.toLocalIso(appointment.start),
      fin: this.timeZone.toLocalIso(appointment.end),
      estado: appointment.status,
      canal: appointment.channel,
      precio: appointment.price,
      descuentoPct: appointment.discountPct,
      precioFinal: appointment.finalPrice,
      notas: appointment.notes,
      barbero: this.barber(appointment.barber),
      servicio: {
        id: appointment.service.id,
        nombre: appointment.service.name,
        duracionMin: appointment.service.durationMin,
      },
      cliente: { id: appointment.client.id, nombre: appointment.client.name, telefono: appointment.client.phone },
    };
  }

  slot(slot: AvailableSlot) {
    return { inicio: this.timeZone.toLocalIso(slot.start), barberos: slot.barbers.map((b) => this.barber(b)) };
  }

  timeBlock(block: TimeBlock) {
    return {
      id: block.id,
      barberoId: block.barber.id,
      inicio: this.timeZone.toLocalIso(block.start),
      fin: this.timeZone.toLocalIso(block.end),
      motivo: block.reason,
      barbero: this.barber(block.barber),
    };
  }

  profile(profile: Profile) {
    return { rol: profile.role, nombre: profile.name, telefono: profile.phone, fechaNacimiento: profile.birthDate };
  }

  contact(contact: Contact) {
    if (contact.kind === "barber") return { tipo: "barbero", barbero: this.barber(contact.barber) };
    return {
      tipo: "cliente",
      cliente: contact.client && {
        nombre: contact.client.name,
        registrado: contact.client.registered,
        descuentoPendientePct: contact.pendingDiscountPct,
      },
      citasProximas: contact.upcomingAppointments.map((a) => this.appointment(a)),
    };
  }
}
