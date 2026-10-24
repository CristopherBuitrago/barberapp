import type { RequestHandler } from "express";
import type { ListActiveBarbers } from "../../../application/use-cases/barbers/ListActiveBarbers.js";
import type { GetImage } from "../../../application/use-cases/images/GetImage.js";
import type { ListCatalog } from "../../../application/use-cases/services/ListCatalog.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";
import { idParam } from "../validators/schemas.js";

/** Lo que ve cualquiera en la web: servicios, barberos e imágenes. */
export class CatalogController {
  constructor(
    private readonly listCatalog: ListCatalog,
    private readonly listActiveBarbers: ListActiveBarbers,
    private readonly getImage: GetImage,
    private readonly presenter: ApiPresenter,
  ) {}

  services: RequestHandler = async (_req, res) => {
    const services = await this.listCatalog.execute();
    res.json(services.map((s) => this.presenter.service(s)));
  };

  barbers: RequestHandler = async (_req, res) => {
    const barbers = await this.listActiveBarbers.execute();
    res.json(barbers.map((b) => this.presenter.barber(b)));
  };

  /** Una imagen nunca cambia (otra imagen es otro id), por eso se cachea fuerte */
  image: RequestHandler = async (req, res) => {
    const image = await this.getImage.execute(idParam.parse(req.params).id);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.type(image.type).send(Buffer.from(image.data));
  };
}
