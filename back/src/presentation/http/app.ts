import cors from "cors";
import express, { type Express } from "express";
import type { AuthenticateSession } from "../../application/use-cases/accounts/AuthenticateSession.js";
import { readSession } from "./middlewares/auth.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { accountRoutes, agentRoutes, panelRoutes, publicRoutes, type Controllers } from "./routes/index.js";

export interface HttpDependencies {
  controllers: Controllers;
  authenticateSession: AuthenticateSession;
  frontOrigin: string;
  agentApiKey: string;
}

/** Arma la app de Express. No escucha ningún puerto, eso lo hace main.ts. */
export function createApp(deps: HttpDependencies): Express {
  const app = express();
  app.use(cors({ origin: deps.frontOrigin }));
  app.use(express.json());
  app.use(readSession(deps.authenticateSession));

  app.get("/salud", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/interno", agentRoutes(deps.controllers, deps.agentApiKey));
  app.use("/api/panel", panelRoutes(deps.controllers));
  app.use("/api/cuenta", accountRoutes(deps.controllers));
  app.use("/api", publicRoutes(deps.controllers));
  app.use(errorHandler);
  return app;
}
