/**
 * Crea o cambia la cuenta de un barbero para entrar al panel.
 *
 *   npm run equipo:cuenta -- --nombre Diego --telefono 3001234567 --clave "una-clave" [--admin]
 *
 * El teléfono también es el que el agente de WhatsApp reconoce como "modo barbero".
 */
import { parseArgs } from "node:util";
import { PrismaClient } from "@prisma/client";
import { hashClave } from "../src/lib/claves.js";
import { normalizarTelefono } from "../src/lib/telefono.js";

const { values } = parseArgs({
  options: {
    nombre: { type: "string" },
    telefono: { type: "string" },
    clave: { type: "string" },
    admin: { type: "boolean", default: false },
  },
});

if (!values.nombre || !values.telefono || !values.clave) {
  console.error('Uso: npm run equipo:cuenta -- --nombre Diego --telefono 3001234567 --clave "una-clave" [--admin]');
  process.exit(1);
}
if (values.clave.length < 6) {
  console.error("La contraseña debe tener al menos 6 caracteres.");
  process.exit(1);
}

const db = new PrismaClient();
try {
  const barbero = await db.barbero.findFirst({ where: { nombre: { equals: values.nombre, mode: "insensitive" } } });
  if (!barbero) {
    const nombres = (await db.barbero.findMany({ select: { nombre: true } })).map((b) => b.nombre);
    console.error(`No hay un barbero llamado "${values.nombre}". Barberos: ${nombres.join(", ") || "(ninguno)"}`);
    process.exit(1);
  }
  const telefono = normalizarTelefono(values.telefono);
  if (await db.cliente.findFirst({ where: { telefono, claveHash: { not: null } } })) {
    console.warn(`Aviso: ${telefono} también tiene cuenta de cliente; con este teléfono se entrará al panel.`);
  }
  await db.barbero.update({
    where: { id: barbero.id },
    data: { telefono, claveHash: await hashClave(values.clave), esAdmin: values.admin },
  });
  console.log(`Cuenta lista: ${barbero.nombre} (${telefono})${values.admin ? " · admin" : ""}.`);
} finally {
  await db.$disconnect();
}
