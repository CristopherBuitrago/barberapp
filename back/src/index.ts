import express from "express";
import cors from "cors";
import { config } from "./lib/config.js";
import { manejadorErrores } from "./lib/errores.js";
import { rutasPublicas } from "./rutas/publicas.js";
import { rutasInterno } from "./rutas/interno.js";
import { rutasPanel } from "./rutas/panel.js";
import { rutasCuenta } from "./rutas/cuenta.js";
import { leerSesion } from "./lib/sesion.js";

const app = express();
app.use(cors({ origin: config.frontOrigen }));
app.use(express.json());
app.use(leerSesion);

app.get("/salud", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api/interno", rutasInterno);
app.use("/api/panel", rutasPanel);
app.use("/api/cuenta", rutasCuenta);
app.use("/api", rutasPublicas);
app.use(manejadorErrores);

app.listen(config.puerto, () => {
  console.log(`Back de la barbería escuchando en http://localhost:${config.puerto}`);
});
