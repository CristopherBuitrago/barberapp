import type { RequestHandler } from "express";
import type { ListTeam } from "../../../application/use-cases/barbers/ListTeam.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";
import { sendPage } from "../responses.js";
import { pageQuery } from "../validators/schemas.js";

export class TeamController {
  constructor(
    private readonly listTeam: ListTeam,
    private readonly presenter: ApiPresenter,
  ) {}

  list: RequestHandler = async (req, res) => {
    const page = pageQuery.parse(req.query);
    sendPage(res, await this.listTeam.execute(page), page, (b) => this.presenter.teamMember(b));
  };
}
