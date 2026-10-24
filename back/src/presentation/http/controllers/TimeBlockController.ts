import type { RequestHandler } from "express";
import type { CreateTimeBlock } from "../../../application/use-cases/time-blocks/CreateTimeBlock.js";
import type { DeleteTimeBlock } from "../../../application/use-cases/time-blocks/DeleteTimeBlock.js";
import type { ListTimeBlocks } from "../../../application/use-cases/time-blocks/ListTimeBlocks.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";
import { sendData, sendPage } from "../responses.js";
import { dateRangeQuery, idParam, pageQuery, timeBlockBody } from "../validators/schemas.js";

/** Bloqueos de horario, desde el panel y desde el agente en modo barbero. */
export class TimeBlockController {
  constructor(
    private readonly listTimeBlocks: ListTimeBlocks,
    private readonly createTimeBlock: CreateTimeBlock,
    private readonly deleteTimeBlock: DeleteTimeBlock,
    private readonly presenter: ApiPresenter,
  ) {}

  list: RequestHandler = async (req, res) => {
    const q = dateRangeQuery.parse(req.query);
    const page = pageQuery.parse(req.query);
    const blocks = await this.listTimeBlocks.execute({ fromDate: q.desde, toDate: q.hasta, page });
    sendPage(res, blocks, page, (b) => this.presenter.timeBlock(b));
  };

  create: RequestHandler = async (req, res) => {
    const body = timeBlockBody.parse(req.body);
    const block = await this.createTimeBlock.execute({
      barberId: body.barberoId,
      start: body.inicio,
      end: body.fin,
      reason: body.motivo,
    });
    sendData(res, this.presenter.timeBlock(block), 201);
  };

  remove: RequestHandler = async (req, res) => {
    await this.deleteTimeBlock.execute(idParam.parse(req.params).id);
    sendData(res, null);
  };
}
