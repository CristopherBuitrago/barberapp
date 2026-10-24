import type { RequestHandler } from "express";
import type { GetDayAgenda } from "../../../application/use-cases/appointments/GetDayAgenda.js";
import type { IdentifyContact } from "../../../application/use-cases/contacts/IdentifyContact.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";
import { agendaQuery } from "../validators/schemas.js";

/** Lo que solo usa el agente de WhatsApp. */
export class AgentController {
  constructor(
    private readonly identifyContact: IdentifyContact,
    private readonly getDayAgenda: GetDayAgenda,
    private readonly presenter: ApiPresenter,
  ) {}

  contact: RequestHandler = async (req, res) => {
    const contact = await this.identifyContact.execute(String(req.params.telefono));
    res.json(this.presenter.contact(contact));
  };

  agenda: RequestHandler = async (req, res) => {
    const q = agendaQuery.parse(req.query);
    const appointments = await this.getDayAgenda.execute({ date: q.fecha, barberId: q.barberoId });
    res.json(appointments.map((a) => this.presenter.appointment(a)));
  };
}
