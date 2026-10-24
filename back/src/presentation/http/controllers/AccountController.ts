import type { RequestHandler } from "express";
import { sessionProfile } from "../../../application/use-cases/accounts/profile.js";
import type { GetActiveAppointment } from "../../../application/use-cases/accounts/GetActiveAppointment.js";
import type { Login } from "../../../application/use-cases/accounts/Login.js";
import type { RegisterClient } from "../../../application/use-cases/accounts/RegisterClient.js";
import type { UpdateProfile } from "../../../application/use-cases/accounts/UpdateProfile.js";
import { requiredSession } from "../middlewares/auth.js";
import type { ApiPresenter } from "../presenters/ApiPresenter.js";
import { sendData } from "../responses.js";
import { clearSessionCookie, setSessionCookie, type CookieOptions } from "../sessionCookie.js";
import { clientProfileBody, loginBody, registerBody, teamProfileBody } from "../validators/schemas.js";

/**
 * Cuentas de la web. Clientes y equipo entran con teléfono y contraseña. El JWT de la
 * sesión va en una cookie httpOnly, nunca en el cuerpo de la respuesta.
 */
export class AccountController {
  constructor(
    private readonly loginUseCase: Login,
    private readonly registerClient: RegisterClient,
    private readonly updateProfile: UpdateProfile,
    private readonly getActiveAppointment: GetActiveAppointment,
    private readonly presenter: ApiPresenter,
    private readonly cookie: CookieOptions,
  ) {}

  login: RequestHandler = async (req, res) => {
    const body = loginBody.parse(req.body);
    const result = await this.loginUseCase.execute({ phone: body.telefono, password: body.clave });
    setSessionCookie(res, result.session, this.cookie);
    sendData(res, { usuario: this.presenter.profile(result.profile) });
  };

  register: RequestHandler = async (req, res) => {
    const body = registerBody.parse(req.body);
    const result = await this.registerClient.execute({
      name: body.nombre,
      phone: body.telefono,
      password: body.clave,
      birthDate: body.fechaNacimiento,
    });
    setSessionCookie(res, result.session, this.cookie);
    sendData(res, { usuario: this.presenter.profile(result.profile), descuentoPct: result.welcomeDiscountPct }, 201);
  };

  me: RequestHandler = (_req, res) => {
    sendData(res, this.presenter.profile(sessionProfile(requiredSession(res))));
  };

  /** Los clientes editan nombre y fecha de nacimiento, el equipo solo el nombre */
  editMe: RequestHandler = async (req, res) => {
    const session = requiredSession(res);
    const body = session.client
      ? clientProfileBody.parse(req.body)
      : { ...teamProfileBody.parse(req.body), fechaNacimiento: undefined };
    const profile = await this.updateProfile.execute({ session, name: body.nombre, birthDate: body.fechaNacimiento });
    sendData(res, this.presenter.profile(profile));
  };

  /** Con JWT no hay nada que borrar en la base: se borra la cookie y el navegador se queda sin sesión */
  logout: RequestHandler = (_req, res) => {
    clearSessionCookie(res, this.cookie);
    sendData(res, null);
  };

  /** null si no tiene cita activa, o si es del equipo */
  activeAppointment: RequestHandler = async (_req, res) => {
    const appointment = await this.getActiveAppointment.execute(requiredSession(res));
    sendData(res, appointment ? this.presenter.appointment(appointment) : null);
  };
}
