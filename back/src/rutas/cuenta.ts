import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { config } from "../lib/config.js";
import { hashClave, verificarClave } from "../lib/claves.js";
import { ErrorNegocio } from "../lib/errores.js";
import { normalizarTelefono } from "../lib/telefono.js";
import { cerrarSesion, crearSesion, presentarUsuario, requiereSesion, sesionDe, type SesionActiva } from "../lib/sesion.js";
import { citasProximasDeCliente } from "../servicios/citas.js";
import { fecha, telefono } from "./esquemas.js";

/** Cuentas de la web: clientes y equipo (barberos/admin) entran con teléfono y contraseña. */
export const rutasCuenta = Router();

const clave = z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100);
const nombre = z.string().trim().min(1).max(80);

rutasCuenta.post("/login", async (req, res) => {
  const body = z.object({ telefono, clave: z.string().min(1) }).parse(req.body);
  const tel = normalizarTelefono(body.telefono);

  // Si el teléfono es de alguien del equipo, entra al panel; si no, es un cliente.
  const barbero = await db.barbero.findFirst({ where: { telefono: tel, activo: true, claveHash: { not: null } } });
  if (barbero && (await verificarClave(body.clave, barbero.claveHash!))) {
    const token = await crearSesion({ barberoId: barbero.id });
    const sesion: SesionActiva = { sesionId: 0, rol: barbero.esAdmin ? "ADMIN" : "BARBERO", barbero };
    res.json({ token, usuario: presentarUsuario(sesion) });
    return;
  }
  const cliente = await db.cliente.findUnique({ where: { telefono: tel } });
  if (!barbero && cliente?.claveHash && (await verificarClave(body.clave, cliente.claveHash))) {
    const token = await crearSesion({ clienteId: cliente.id });
    res.json({ token, usuario: presentarUsuario({ sesionId: 0, rol: "CLIENTE", cliente }) });
    return;
  }
  throw new ErrorNegocio(401, "Teléfono o contraseña incorrectos");
});

/** Crear cuenta de cliente. Da el descuento de bienvenida para la próxima cita. */
rutasCuenta.post("/registro", async (req, res) => {
  const body = z
    .object({
      nombre,
      telefono,
      clave,
      fechaNacimiento: fecha.optional(),
      aceptaDatos: z.literal(true, { error: "Debes aceptar el tratamiento de datos" }),
    })
    .parse(req.body);
  const tel = normalizarTelefono(body.telefono);

  if (await db.barbero.findFirst({ where: { telefono: tel } })) {
    throw new ErrorNegocio(409, "Ese teléfono ya tiene una cuenta. Inicia sesión.");
  }
  const existente = await db.cliente.findUnique({ where: { telefono: tel } });
  if (existente?.claveHash) throw new ErrorNegocio(409, "Ese teléfono ya tiene una cuenta. Inicia sesión.");

  // Si ya había reservado sin cuenta (web o WhatsApp), su historial queda en la misma ficha.
  const datos = {
    nombre: body.nombre,
    registrado: true,
    aceptaDatos: true,
    claveHash: await hashClave(body.clave),
    fechaNacimiento: body.fechaNacimiento ? new Date(`${body.fechaNacimiento}T00:00:00Z`) : null,
  };
  const cliente = await db.cliente.upsert({ where: { telefono: tel }, create: { telefono: tel, ...datos }, update: datos });
  const token = await crearSesion({ clienteId: cliente.id });
  res.status(201).json({
    token,
    usuario: presentarUsuario({ sesionId: 0, rol: "CLIENTE", cliente }),
    descuentoPct: cliente.descuentoBienvenidaUsado ? 0 : config.descuentoRegistroPct,
  });
});

rutasCuenta.get("/yo", requiereSesion, (_req, res) => {
  res.json(presentarUsuario(sesionDe(res)!));
});

/** Editar el perfil. El teléfono no cambia (es con lo que se inicia sesión). */
rutasCuenta.patch("/yo", requiereSesion, async (req, res) => {
  const sesion = sesionDe(res)!;
  if (sesion.rol === "CLIENTE") {
    const body = z.object({ nombre, fechaNacimiento: fecha.nullable().optional() }).parse(req.body);
    const cliente = await db.cliente.update({
      where: { id: sesion.cliente.id },
      data: {
        nombre: body.nombre,
        ...(body.fechaNacimiento !== undefined && {
          fechaNacimiento: body.fechaNacimiento ? new Date(`${body.fechaNacimiento}T00:00:00Z`) : null,
        }),
      },
    });
    res.json(presentarUsuario({ ...sesion, cliente }));
    return;
  }
  const body = z.object({ nombre }).parse(req.body);
  const barbero = await db.barbero.update({ where: { id: sesion.barbero.id }, data: { nombre: body.nombre } });
  res.json(presentarUsuario({ ...sesion, barbero }));
});

rutasCuenta.post("/logout", requiereSesion, async (_req, res) => {
  await cerrarSesion(sesionDe(res)!.sesionId);
  res.status(204).end();
});

/** La cita activa del cliente con sesión (también las que agendó por WhatsApp). */
rutasCuenta.get("/yo/cita-activa", requiereSesion, async (_req, res) => {
  const sesion = sesionDe(res)!;
  if (sesion.rol !== "CLIENTE") {
    res.json(null);
    return;
  }
  const [proxima] = await citasProximasDeCliente(sesion.cliente.telefono);
  res.json(proxima ?? null);
});
