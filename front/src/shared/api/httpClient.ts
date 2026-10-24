/**
 * Cliente de la API del back. Todas las respuestas vienen en el mismo sobre:
 *   { success, data, error } y las listas además con pagination { page, perPage, total }
 * Aquí se saca data del sobre y los errores se lanzan como ApiError con su código.
 */
import { sessionEvents } from "./sessionEvents";

const BASE = import.meta.env.VITE_API_URL ?? "";
const PER_PAGE = 100;

interface Envelope<T> {
  success: boolean;
  data: T;
  pagination?: { page: number; perPage: number; total: number };
  error: { code: string; message: string; details: unknown } | null;
}

/** Error del back: el código sirve para decidir, el mensaje para mostrarlo */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function send<T>(method: string, path: string, body?: BodyInit, contentType = "application/json"): Promise<Envelope<T>> {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { "Content-Type": contentType },
    body,
    // Para que el navegador mande la cookie de sesión también si el back está en otro dominio
    credentials: "include",
  });
  const envelope = (await res.json().catch(() => null)) as Envelope<T> | null;
  // Un 401 es que no hay sesión (venció o la cerraron), menos cuando es la contraseña equivocada del login
  if (res.status === 401 && envelope?.error?.code !== "INVALID_CREDENTIALS") sessionEvents.expired();
  if (!envelope?.success) {
    throw new ApiError(envelope?.error?.code ?? "UNKNOWN", envelope?.error?.message ?? `Error ${res.status}`, res.status);
  }
  return envelope;
}

function json(body: unknown): string | undefined {
  return body === undefined ? undefined : JSON.stringify(body);
}

export const http = {
  get: async <T>(path: string) => (await send<T>("GET", path)).data,
  post: async <T>(path: string, body?: unknown) => (await send<T>("POST", path, json(body))).data,
  patch: async <T>(path: string, body?: unknown) => (await send<T>("PATCH", path, json(body))).data,
  delete: async <T>(path: string) => (await send<T>("DELETE", path)).data,

  /** Para mandar un archivo tal cual, no como JSON */
  upload: async <T>(path: string, file: File) => (await send<T>("POST", path, file, file.type)).data,

  /** Para las listas que la pantalla necesita completas: pide página por página hasta tenerlas todas */
  getAll: async <T>(path: string): Promise<T[]> => {
    const separator = path.includes("?") ? "&" : "?";
    const all: T[] = [];
    for (let page = 1; ; page++) {
      const envelope = await send<T[]>("GET", `${path}${separator}page=${page}&perPage=${PER_PAGE}`);
      all.push(...envelope.data);
      if (!envelope.pagination || all.length >= envelope.pagination.total || envelope.data.length === 0) return all;
    }
  },
};

/** Las imágenes subidas vienen como "/api/imagenes/3": se resuelven contra el back */
export function resolveImageUrl(url: string | null): string | null {
  return url?.startsWith("/api/") ? `${BASE}${url}` : url;
}
