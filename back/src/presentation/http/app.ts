import cors from "cors";
import express, { type Express } from "express";
import type { AuthenticateSession } from "../../application/use-cases/accounts/AuthenticateSession.js";
import { docsRoutes } from "./docs/swagger.js";
import { readSession } from "./middlewares/auth.js";
import type { CookieOptions } from "./sessionCookie.js";
import { errorHandler, routeNotFound } from "./middlewares/errorHandler.js";
import { sendData } from "./responses.js";
import { accountRoutes, agentRoutes, panelRoutes, publicRoutes, type Controllers } from "./routes/index.js";

export interface HttpDependencies {
  controllers: Controllers;
  authenticateSession: AuthenticateSession;
  frontOrigin: string;
  sessionCookie: CookieOptions;
  agentApiKey: string;
}

/** Arma la app de Express. No escucha ningún puerto, eso lo hace main.ts. */
export function createApp(deps: HttpDependencies): Express {
  const app = express();
  // credentials: el front manda la cookie de sesión aunque esté en otro dominio
  app.use(cors({ origin: deps.frontOrigin, credentials: true }));
  app.use(express.json());
  app.use(readSession(deps.authenticateSession, deps.sessionCookie));

  app.get("/salud", (_req, res) => {
    sendData(res, { ok: true });
  });
  // La documentación es lo único que no responde con el sobre: es una página y su JSON de OpenAPI
  app.use("/api/docs", docsRoutes());
  app.use("/api/interno", agentRoutes(deps.controllers, deps.agentApiKey));
  app.use("/api/panel", panelRoutes(deps.controllers));
  app.use("/api/cuenta", accountRoutes(deps.controllers));
  app.use("/api", publicRoutes(deps.controllers));
  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
}
