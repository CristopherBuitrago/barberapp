import type { RequestHandler } from "express";
import type { GetAvailability } from "../../../application/use-cases/availability/GetAvailability.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";
import { sendPage } from "../responses.js";
import { availabilityQuery, pageQuery } from "../validators/schemas.js";

export class AvailabilityController {
  constructor(
    private readonly getAvailability: GetAvailability,
    private readonly presenter: ApiPresenter,
  ) {}

  freeSlots: RequestHandler = async (req, res) => {
    const q = availabilityQuery.parse(req.query);
    const page = pageQuery.parse(req.query);
    const slots = await this.getAvailability.execute({ serviceId: q.servicioId, date: q.fecha, barberId: q.barberoId, page });
    sendPage(res, slots, page, (s) => this.presenter.slot(s));
  };
}
