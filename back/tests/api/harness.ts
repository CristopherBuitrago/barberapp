/**
 * Lo que comparten las pruebas de la API. Deja la base de pruebas limpia con datos
 * conocidos y levanta el servidor de verdad aparte.
 * No importa nada de src/ a propósito, así las mismas pruebas sirven antes y
 * después de mover la arquitectura.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://barberia:barberia@localhost:5433/barberia_test?schema=public";
export const AGENT_KEY = "test-agent-key";
const PORT = Number(process.env.TEST_PORT ?? 3999);
export const BASE = `http://127.0.0.1:${PORT}`;

export const db = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, length: number) => Promise<Buffer>;

/** Igual a como lo guarda el back: "scrypt$<sal>$<hash>" en base64url. */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export const ADMIN = { phone: "3001112233", password: "admin1234" };
export const BARBER = { phone: "3004445566", password: "barbero1234" };

export interface Fixtures {
  adminId: number;
  barberId: number;
  inactiveBarberId: number;
  haircutId: number; // Corte de 30 min a $20.000
  beardId: number; // Corte + barba de 60 min a $35.000
  hiddenServiceId: number;
}

/** Vacía todas las tablas y carga los mismos datos en cada archivo de pruebas. */
export async function resetDatabase(): Promise<Fixtures> {
  await db.$executeRawUnsafe(
    'TRUNCATE "Cita", "Sesion", "BloqueoHorario", "HorarioBarbero", "Servicio", "Imagen", "Cliente", "Barbero" RESTART IDENTITY CASCADE',
  );
  const allWeek = Array.from({ length: 7 }, (_, day) => ({ diaSemana: day, horaInicio: "08:00", horaFin: "20:00" }));
  const admin = await db.barbero.create({
    data: {
      nombre: "Diego",
      telefono: "57" + ADMIN.phone,
      esAdmin: true,
      claveHash: await hashPassword(ADMIN.password),
      horarios: { create: allWeek },
    },
  });
  const barber = await db.barbero.create({
    data: {
      nombre: "Andrés",
      telefono: "57" + BARBER.phone,
      claveHash: await hashPassword(BARBER.password),
      horarios: { create: allWeek },
    },
  });
  const inactive = await db.barbero.create({ data: { nombre: "Retirado", activo: false } });
  const haircut = await db.servicio.create({
    data: { nombre: "Corte", descripcion: "Corte clásico", duracionMin: 30, precio: 20000 },
  });
  const beard = await db.servicio.create({
    data: { nombre: "Corte + barba", descripcion: "", duracionMin: 60, precio: 35000 },
  });
  const hidden = await db.servicio.create({
    data: { nombre: "Oculto", descripcion: "", duracionMin: 30, precio: 1000, activo: false },
  });
  return {
    adminId: admin.id,
    barberId: barber.id,
    inactiveBarberId: inactive.id,
    haircutId: haircut.id,
    beardId: beard.id,
    hiddenServiceId: hidden.id,
  };
}

let server: ChildProcess | undefined;

/** Arranca el back (el archivo de entrada sale de API_ENTRY, por defecto src/main.ts) y espera a que /salud responda. */
export async function startApi(): Promise<void> {
  const entry = process.env.API_ENTRY ?? "src/main.ts";
  server = spawn(process.execPath, ["--import", "tsx", entry], {
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      AGENTE_API_KEY: AGENT_KEY,
      PUERTO: String(PORT),
      ZONA_DESFASE: "-05:00",
      INTERVALO_MIN: "30",
      DESCUENTO_REGISTRO_PCT: "10",
    },
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${BASE}/salud`)).ok) return;
    } catch {
      // Todavía no está escuchando
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`The API did not start (${entry})`);
}

export async function stopApi(): Promise<void> {
  server?.kill();
  await db.$disconnect();
}

export interface Reply<T = any> {
  status: number;
  body: T;
}

export async function call<T = any>(
  method: string,
  path: string,
  options: { body?: unknown; token?: string; agent?: boolean; raw?: { type: string; data: Buffer } } = {},
): Promise<Reply<T>> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.agent) headers["x-api-key"] = AGENT_KEY;
  let body: BodyInit | undefined;
  if (options.raw) {
    headers["Content-Type"] = options.raw.type;
    body = new Uint8Array(options.raw.data);
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    // Vino una imagen o texto plano
  }
  return { status: res.status, body: parsed as T };
}

export async function login(phone: string, password: string): Promise<string> {
  const res = await call("POST", "/api/cuenta/login", { body: { telefono: phone, clave: password } });
  if (res.status !== 200) throw new Error(`Login failed for ${phone}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

/** Fecha en Colombia dentro de N días, "YYYY-MM-DD". */
export function dayFromToday(days: number): string {
  return new Date(Date.now() - 5 * 3600_000 + days * 86400_000).toISOString().slice(0, 10);
}

/** "2026-10-30" + "10:00" -> "2026-10-30T10:00:00-05:00". */
export function at(date: string, time: string): string {
  return `${date}T${time}:00-05:00`;
}
