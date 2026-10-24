import { PrismaClient, type Prisma } from "@prisma/client";

/** El cliente de Prisma normal o el de una transacción, los repositorios sirven con los dos. */
export type Db = PrismaClient | Prisma.TransactionClient;

// La URL se pasa aquí y no por env("DATABASE_URL") para que también pueda venir de un secreto
export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({ datasourceUrl: databaseUrl });
}
