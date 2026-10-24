import { PrismaClient } from "@prisma/client";
import { secretoRequerido } from "./secretos.js";

// La URL se pasa aquí (y no por env("DATABASE_URL")) para que también pueda venir de un secreto.
export const db = new PrismaClient({ datasourceUrl: secretoRequerido("DATABASE_URL") });
