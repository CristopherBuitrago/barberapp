/**
 * Le pone la cuenta del panel a un barbero que ya existe, o le cambia la contraseña.
 *
 *   npm run equipo:cuenta -- --nombre Diego --telefono 3001234567 --clave "una-clave" [--admin]
 *
 * Ese teléfono también es con el que el agente de WhatsApp lo reconoce en modo barbero.
 */
import { parseArgs } from "node:util";
import { SaveTeamAccount } from "../src/application/use-cases/barbers/SaveTeamAccount.js";
import { DomainError } from "../src/domain/errors/DomainError.js";
import { requiredSecret } from "../src/infrastructure/config/secrets.js";
import { createPrismaClient } from "../src/infrastructure/persistence/prisma/client.js";
import { PrismaBarberRepository } from "../src/infrastructure/persistence/prisma/PrismaBarberRepository.js";
import { PrismaClientRepository } from "../src/infrastructure/persistence/prisma/PrismaClientRepository.js";
import { ScryptPasswordHasher } from "../src/infrastructure/security/ScryptPasswordHasher.js";

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

const prisma = createPrismaClient(requiredSecret("DATABASE_URL"));
const saveTeamAccount = new SaveTeamAccount(
  new PrismaBarberRepository(prisma),
  new PrismaClientRepository(prisma),
  new ScryptPasswordHasher(),
);

try {
  const { barber, alsoClientAccount } = await saveTeamAccount.execute({
    name: values.nombre,
    phone: values.telefono,
    password: values.clave,
    isAdmin: values.admin,
  });
  if (alsoClientAccount) {
    console.warn(`Ojo: ${barber.phone} también tiene cuenta de cliente. Con ese teléfono se va a entrar al panel.`);
  }
  console.log(`Cuenta lista: ${barber.name} (${barber.phone})${barber.isAdmin ? " · admin" : ""}.`);
} catch (error) {
  if (!(error instanceof DomainError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
