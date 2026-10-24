import express, { Router } from "express";
import { IMAGE_TYPES } from "../../../domain/entities/Image.js";
import type { AccountController } from "../controllers/AccountController.js";
import type { AgentController } from "../controllers/AgentController.js";
import type { AppointmentController } from "../controllers/AppointmentController.js";
import type { AvailabilityController } from "../controllers/AvailabilityController.js";
import type { CatalogController } from "../controllers/CatalogController.js";
import type { ServiceAdminController } from "../controllers/ServiceAdminController.js";
import type { TeamController } from "../controllers/TeamController.js";
import type { TimeBlockController } from "../controllers/TimeBlockController.js";
import { requireAdmin, requireAgent, requireSession, requireTeam } from "../middlewares/auth.js";

export interface Controllers {
  catalog: CatalogController;
  availability: AvailabilityController;
  appointments: AppointmentController;
  accounts: AccountController;
  agent: AgentController;
  timeBlocks: TimeBlockController;
  team: TeamController;
  serviceAdmin: ServiceAdminController;
}

/** Lo que usa la web del cliente, y también el agente para reservar y gestionar citas. */
export function publicRoutes(c: Controllers): Router {
  const router = Router();
  router.get("/servicios", c.catalog.services);
  router.get("/barberos", c.catalog.barbers);
  router.get("/imagenes/:id", c.catalog.image);
  router.get("/disponibilidad", c.availability.freeSlots);
  router.post("/citas", c.appointments.book);
  router.get("/citas/:id", c.appointments.show);
  router.post("/citas/:id/cancelar", c.appointments.cancel);
  router.post("/citas/:id/reprogramar", c.appointments.reschedule);
  return router;
}

export function accountRoutes(c: Controllers): Router {
  const router = Router();
  router.post("/login", c.accounts.login);
  router.post("/registro", c.accounts.register);
  router.get("/yo", requireSession, c.accounts.me);
  router.patch("/yo", requireSession, c.accounts.editMe);
  router.post("/logout", requireSession, c.accounts.logout);
  router.get("/yo/cita-activa", requireSession, c.accounts.activeAppointment);
  return router;
}

/** Solo para el agente de WhatsApp, con el header x-api-key. */
export function agentRoutes(c: Controllers, agentApiKey: string): Router {
  const router = Router();
  router.use(requireAgent(agentApiKey));
  router.get("/contactos/:telefono", c.agent.contact);
  router.get("/agenda", c.agent.agenda);
  router.post("/bloqueos", c.timeBlocks.create);
  return router;
}

/** El panel, con sesión de un barbero o del admin. Los servicios son solo del admin. */
export function panelRoutes(c: Controllers): Router {
  const router = Router();
  router.use(requireTeam);
  router.get("/verificar", (_req, res) => {
    res.json({ ok: true });
  });
  router.get("/citas", c.appointments.inRange);
  router.post("/citas", c.appointments.bookFromPanel);
  router.patch("/citas/:id/estado", c.appointments.updateStatus);
  router.get("/barberos", c.team.list);
  router.get("/bloqueos", c.timeBlocks.list);
  router.post("/bloqueos", c.timeBlocks.create);
  router.delete("/bloqueos/:id", c.timeBlocks.remove);

  router.get("/servicios", requireAdmin, c.serviceAdmin.list);
  router.post("/servicios", requireAdmin, c.serviceAdmin.create);
  router.patch("/servicios/:id", requireAdmin, c.serviceAdmin.update);
  // La imagen llega como el archivo tal cual, máximo 3 MB
  router.post(
    "/imagenes",
    requireAdmin,
    express.raw({ type: [...IMAGE_TYPES], limit: "3mb" }),
    c.serviceAdmin.image,
  );
  return router;
}
