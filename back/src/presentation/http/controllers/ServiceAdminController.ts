import type { RequestHandler, Response } from "express";
import type { UploadImage } from "../../../application/use-cases/images/UploadImage.js";
import type { CreateService } from "../../../application/use-cases/services/CreateService.js";
import type { ListServicesForAdmin } from "../../../application/use-cases/services/ListServicesForAdmin.js";
import type { UpdateService } from "../../../application/use-cases/services/UpdateService.js";
import type { Barber } from "../../../domain/entities/Barber.js";
import type { EditableServiceFields } from "../../../domain/entities/Service.js";
import { requiredSession } from "../middlewares/auth.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";
import { idParam, serviceBody } from "../validators/schemas.js";

type ServiceBody = Partial<ReturnType<typeof serviceBody.parse>>;

function toFields(body: ServiceBody): Partial<EditableServiceFields> {
  return {
    name: body.nombre,
    description: body.descripcion,
    durationMin: body.duracionMin,
    price: body.precio,
    imageUrl: body.imagenUrl,
    active: body.activo,
  };
}

/** El catálogo de servicios del lado del admin. */
export class ServiceAdminController {
  constructor(
    private readonly listServices: ListServicesForAdmin,
    private readonly createService: CreateService,
    private readonly updateService: UpdateService,
    private readonly uploadImage: UploadImage,
    private readonly presenter: ApiPresenter,
  ) {}

  /** El admin que está haciendo el cambio, queda guardado en el servicio */
  private author(res: Response): Barber {
    const barber = requiredSession(res).barber;
    if (!barber) throw new Error("Esta ruta debería ir detrás de requireTeam");
    return barber;
  }

  list: RequestHandler = async (_req, res) => {
    const services = await this.listServices.execute();
    res.json(services.map((s) => this.presenter.serviceForAdmin(s)));
  };

  create: RequestHandler = async (req, res) => {
    const fields = toFields(serviceBody.parse(req.body)) as EditableServiceFields;
    const service = await this.createService.execute({ fields, author: this.author(res) });
    res.status(201).json(this.presenter.serviceForAdmin(service));
  };

  /** Sirve para editar y también para ocultar o mostrar */
  update: RequestHandler = async (req, res) => {
    const service = await this.updateService.execute({
      serviceId: idParam.parse(req.params).id,
      fields: toFields(serviceBody.partial().parse(req.body)),
      author: this.author(res),
    });
    res.json(this.presenter.serviceForAdmin(service));
  };

  /** El cuerpo es el archivo tal cual. Devuelve la URL con la que se muestra */
  image: RequestHandler = async (req, res) => {
    const image = await this.uploadImage.execute({
      type: req.header("content-type") ?? "",
      data: Buffer.isBuffer(req.body) ? new Uint8Array(req.body) : null,
    });
    res.status(201).json({ url: image.url });
  };
}
