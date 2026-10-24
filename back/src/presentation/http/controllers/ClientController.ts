import type { RequestHandler } from "express";
import type { ListClients } from "../../../application/use-cases/clients/ListClients.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";
import { sendPage } from "../responses.js";
import { clientsQuery, pageQuery } from "../validators/schemas.js";

/** Los clientes de la barbería, solo para que el admin los vea. */
export class ClientController {
  constructor(
    private readonly listClients: ListClients,
    private readonly presenter: ApiPresenter,
  ) {}

  list: RequestHandler = async (req, res) => {
    const { buscar } = clientsQuery.parse(req.query);
    const page = pageQuery.parse(req.query);
    sendPage(res, await this.listClients.execute({ search: buscar, page }), page, (c) => this.presenter.clientSummary(c));
  };
}
