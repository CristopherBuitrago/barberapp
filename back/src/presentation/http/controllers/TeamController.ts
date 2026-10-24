import type { RequestHandler } from "express";
import type { ListTeam } from "../../../application/use-cases/barbers/ListTeam.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";

export class TeamController {
  constructor(
    private readonly listTeam: ListTeam,
    private readonly presenter: ApiPresenter,
  ) {}

  list: RequestHandler = async (_req, res) => {
    const team = await this.listTeam.execute();
    res.json(team.map((b) => this.presenter.teamMember(b)));
  };
}
