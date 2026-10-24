import type { RequestHandler } from "express";
import { sessionProfile } from "../../../application/use-cases/accounts/profile.js";
import type { GetActiveAppointment } from "../../../application/use-cases/accounts/GetActiveAppointment.js";
import type { Login } from "../../../application/use-cases/accounts/Login.js";
import type { Logout } from "../../../application/use-cases/accounts/Logout.js";
import type { RegisterClient } from "../../../application/use-cases/accounts/RegisterClient.js";
import type { UpdateProfile } from "../../../application/use-cases/accounts/UpdateProfile.js";
import { requiredSession } from "../middlewares/auth.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";
import { clientProfileBody, loginBody, registerBody, teamProfileBody } from "../validators/schemas.js";

/** Cuentas de la web. Clientes y equipo entran con teléfono y contraseña. */
export class AccountController {
  constructor(
    private readonly loginUseCase: Login,
    private readonly registerClient: RegisterClient,
    private readonly updateProfile: UpdateProfile,
    private readonly logoutUseCase: Logout,
    private readonly getActiveAppointment: GetActiveAppointment,
    private readonly presenter: ApiPresenter,
  ) {}

  login: RequestHandler = async (req, res) => {
    const body = loginBody.parse(req.body);
    const result = await this.loginUseCase.execute({ phone: body.telefono, password: body.clave });
    res.json({ token: result.token, usuario: this.presenter.profile(result.profile) });
  };

  register: RequestHandler = async (req, res) => {
    const body = registerBody.parse(req.body);
    const result = await this.registerClient.execute({
      name: body.nombre,
      phone: body.telefono,
      password: body.clave,
      birthDate: body.fechaNacimiento,
    });
    res.status(201).json({
      token: result.token,
      usuario: this.presenter.profile(result.profile),
      descuentoPct: result.welcomeDiscountPct,
    });
  };

  me: RequestHandler = (_req, res) => {
    res.json(this.presenter.profile(sessionProfile(requiredSession(res))));
  };

  /** Los clientes editan nombre y fecha de nacimiento, el equipo solo el nombre */
  editMe: RequestHandler = async (req, res) => {
    const session = requiredSession(res);
    const body = session.client
      ? clientProfileBody.parse(req.body)
      : { ...teamProfileBody.parse(req.body), fechaNacimiento: undefined };
    const profile = await this.updateProfile.execute({ session, name: body.nombre, birthDate: body.fechaNacimiento });
    res.json(this.presenter.profile(profile));
  };

  logout: RequestHandler = async (_req, res) => {
    await this.logoutUseCase.execute(requiredSession(res));
    res.status(204).end();
  };

  activeAppointment: RequestHandler = async (_req, res) => {
    const appointment = await this.getActiveAppointment.execute(requiredSession(res));
    res.json(appointment ? this.presenter.appointment(appointment) : null);
  };
}
