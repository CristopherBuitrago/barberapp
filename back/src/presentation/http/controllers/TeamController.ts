import type { RequestHandler, Response } from "express";
import type { CreateBarber } from "../../../application/use-cases/barbers/CreateBarber.js";
import type { GiveBarberAccount } from "../../../application/use-cases/barbers/GiveBarberAccount.js";
import type { ListTeam } from "../../../application/use-cases/barbers/ListTeam.js";
import type { UpdateBarber } from "../../../application/use-cases/barbers/UpdateBarber.js";
import type { Barber } from "../../../domain/entities/Barber.js";
import { requiredSession } from "../middlewares/auth.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";
import { sendData, sendPage } from "../responses.js";
import { barberAccountBody, barberBody, barberUpdateBody, idParam, pageQuery } from "../validators/schemas.js";

type ScheduleBody = { diaSemana: number; horaInicio: string; horaFin: string }[];

function toSchedules(horarios: ScheduleBody) {
  return horarios.map((h) => ({ weekday: h.diaSemana, startTime: h.horaInicio, endTime: h.horaFin }));
}

/** El equipo: todos lo ven, solo el admin lo cambia. */
export class TeamController {
  constructor(
    private readonly listTeam: ListTeam,
    private readonly createBarber: CreateBarber,
    private readonly updateBarber: UpdateBarber,
    private readonly giveAccount: GiveBarberAccount,
    private readonly presenter: ApiPresenter,
  ) {}

  /** El admin que está haciendo el cambio */
  private actor(res: Response): Barber {
    const barber = requiredSession(res).barber;
    if (!barber) throw new Error("Esta ruta debería ir detrás de requireTeam");
    return barber;
  }

  list: RequestHandler = async (req, res) => {
    const page = pageQuery.parse(req.query);
    sendPage(res, await this.listTeam.execute(page), page, (b) => this.presenter.teamMember(b));
  };

  create: RequestHandler = async (req, res) => {
    const body = barberBody.parse(req.body);
    const barber = await this.createBarber.execute({
      name: body.nombre,
      phone: body.telefono,
      schedules: toSchedules(body.horarios),
    });
    sendData(res, this.presenter.teamMember(barber), 201);
  };

  update: RequestHandler = async (req, res) => {
    const body = barberUpdateBody.parse(req.body);
    const barber = await this.updateBarber.execute(
      {
        barberId: idParam.parse(req.params).id,
        name: body.nombre,
        phone: body.telefono,
        active: body.activo,
        schedules: body.horarios && toSchedules(body.horarios),
      },
      this.actor(res),
    );
    sendData(res, this.presenter.teamMember(barber));
  };

  /** Le da cuenta del panel o le cambia la contraseña */
  account: RequestHandler = async (req, res) => {
    const { clave } = barberAccountBody.parse(req.body);
    const barber = await this.giveAccount.execute({ barberId: idParam.parse(req.params).id, password: clave });
    sendData(res, this.presenter.teamMember(barber));
  };
}
