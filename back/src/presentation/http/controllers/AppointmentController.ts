import type { RequestHandler } from "express";
import type { CancelAppointment } from "../../../application/use-cases/appointments/CancelAppointment.js";
import type { ChangeAppointmentStatus } from "../../../application/use-cases/appointments/ChangeAppointmentStatus.js";
import type { CreateAppointment } from "../../../application/use-cases/appointments/CreateAppointment.js";
import type { GetAppointment } from "../../../application/use-cases/appointments/GetAppointment.js";
import type { ListAppointments } from "../../../application/use-cases/appointments/ListAppointments.js";
import type { RescheduleAppointment } from "../../../application/use-cases/appointments/RescheduleAppointment.js";
import { BookingChannel } from "../../../domain/entities/Appointment.js";
import { isAgent, sessionOf } from "../middlewares/auth.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";
import {
  dateRangeQuery,
  idParam,
  newAppointment,
  ownerPhoneBody,
  ownerPhoneQuery,
  rescheduleBody,
  statusBody,
} from "../validators/schemas.js";

export class AppointmentController {
  constructor(
    private readonly createAppointment: CreateAppointment,
    private readonly getAppointment: GetAppointment,
    private readonly cancelAppointment: CancelAppointment,
    private readonly rescheduleAppointment: RescheduleAppointment,
    private readonly listAppointments: ListAppointments,
    private readonly changeStatus: ChangeAppointmentStatus,
    private readonly presenter: ApiPresenter,
    private readonly agentApiKey: string,
  ) {}

  /** Reserva de la web, o de WhatsApp si viene con la clave del agente */
  book: RequestHandler = async (req, res) => {
    const body = newAppointment.parse(req.body);
    const session = sessionOf(res);
    const appointment = await this.createAppointment.execute({
      serviceId: body.servicioId,
      barberId: body.barberoId,
      start: body.inicio,
      client: { name: body.cliente.nombre, phone: body.cliente.telefono, acceptsDataPolicy: body.cliente.aceptaDatos },
      channel: isAgent(req, this.agentApiKey) ? BookingChannel.WhatsApp : BookingChannel.Web,
      notes: body.notas,
      sessionClient: session?.role === "CLIENTE" ? session.client : undefined,
    });
    res.status(201).json(this.presenter.appointment(appointment));
  };

  /** Cita de alguien que llega o llama, creada desde el panel */
  bookFromPanel: RequestHandler = async (req, res) => {
    const body = newAppointment.parse(req.body);
    const appointment = await this.createAppointment.execute({
      serviceId: body.servicioId,
      barberId: body.barberoId,
      start: body.inicio,
      client: { name: body.cliente.nombre, phone: body.cliente.telefono, acceptsDataPolicy: body.cliente.aceptaDatos },
      channel: BookingChannel.Panel,
      notes: body.notas,
    });
    res.status(201).json(this.presenter.appointment(appointment));
  };

  show: RequestHandler = async (req, res) => {
    const { telefono } = ownerPhoneQuery.parse(req.query);
    const appointment = await this.getAppointment.execute({ appointmentId: idParam.parse(req.params).id, phone: telefono });
    res.json(this.presenter.appointment(appointment));
  };

  cancel: RequestHandler = async (req, res) => {
    const { telefono } = ownerPhoneBody.parse(req.body);
    const appointment = await this.cancelAppointment.execute({ appointmentId: idParam.parse(req.params).id, phone: telefono });
    res.json(this.presenter.appointment(appointment));
  };

  reschedule: RequestHandler = async (req, res) => {
    const body = rescheduleBody.parse(req.body);
    const appointment = await this.rescheduleAppointment.execute({
      appointmentId: idParam.parse(req.params).id,
      phone: body.telefono,
      start: body.inicio,
    });
    res.json(this.presenter.appointment(appointment));
  };

  /** Calendario del panel */
  inRange: RequestHandler = async (req, res) => {
    const q = dateRangeQuery.parse(req.query);
    const appointments = await this.listAppointments.execute({ fromDate: q.desde, toDate: q.hasta, barberId: q.barberoId });
    res.json(appointments.map((a) => this.presenter.appointment(a)));
  };

  updateStatus: RequestHandler = async (req, res) => {
    const { estado } = statusBody.parse(req.body);
    const result = await this.changeStatus.execute({ appointmentId: idParam.parse(req.params).id, status: estado });
    res.json({ id: result.id, estado: result.status });
  };
}
