import type { RequestHandler } from "express";
import type { ListActiveBarbers } from "../../../application/use-cases/barbers/ListActiveBarbers.js";
import type { GetImage } from "../../../application/use-cases/images/GetImage.js";
import type { ListCatalog } from "../../../application/use-cases/services/ListCatalog.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";
import { sendPage } from "../responses.js";
import { idParam, pageQuery } from "../validators/schemas.js";

/** Lo que ve cualquiera en la web: servicios, barberos e imágenes. */
export class CatalogController {
  constructor(
    private readonly listCatalog: ListCatalog,
    private readonly listActiveBarbers: ListActiveBarbers,
    private readonly getImage: GetImage,
    private readonly presenter: ApiPresenter,
  ) {}

  services: RequestHandler = async (req, res) => {
    const page = pageQuery.parse(req.query);
    sendPage(res, await this.listCatalog.execute(page), page, (s) => this.presenter.service(s));
  };

  barbers: RequestHandler = async (req, res) => {
    const page = pageQuery.parse(req.query);
    sendPage(res, await this.listActiveBarbers.execute(page), page, (b) => this.presenter.barber(b));
  };

  /**
   * Esta es la única ruta que no responde con el sobre de siempre, porque la usa un <img>.
   * Una imagen nunca cambia (otra imagen es otro id), por eso se cachea fuerte
   */
  image: RequestHandler = async (req, res) => {
    const image = await this.getImage.execute(idParam.parse(req.params).id);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.type(image.type).send(Buffer.from(image.data));
  };
}
