import type { RequestHandler } from "express";
import type { GetDayAgenda } from "../../../application/use-cases/appointments/GetDayAgenda.js";
import type { IdentifyContact } from "../../../application/use-cases/contacts/IdentifyContact.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";
import { sendData, sendPage } from "../responses.js";
import { agendaQuery, pageQuery } from "../validators/schemas.js";

/** Lo que solo usa el agente de WhatsApp. */
export class AgentController {
  constructor(
    private readonly identifyContact: IdentifyContact,
    private readonly getDayAgenda: GetDayAgenda,
    private readonly presenter: ApiPresenter,
  ) {}

  contact: RequestHandler = async (req, res) => {
    const contact = await this.identifyContact.execute(String(req.params.telefono));
    sendData(res, this.presenter.contact(contact));
  };

  agenda: RequestHandler = async (req, res) => {
    const q = agendaQuery.parse(req.query);
    const page = pageQuery.parse(req.query);
    const appointments = await this.getDayAgenda.execute({ date: q.fecha, barberId: q.barberoId, page });
    sendPage(res, appointments, page, (a) => this.presenter.appointment(a));
  };
}
