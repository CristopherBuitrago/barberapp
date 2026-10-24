import { almacen } from "./almacen";
const BASE = import.meta.env.VITE_API_URL ?? "";

export const barberia = {
  nombre: import.meta.env.VITE_BARBERIA_NOMBRE ?? "Diego Barber",
  whatsapp: import.meta.env.VITE_WHATSAPP_BARBERIA ?? "",
  descuentoRegistroPct: Number(import.meta.env.VITE_DESCUENTO_REGISTRO_PCT ?? 10),
};

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precio: number;
  imagenUrl: string | null;
  activo: boolean;
}

export type DatosServicio = Omit<Servicio, "id">;

/** Servicio como lo ve el admin: con quién lo creó y quién lo cambió por última vez. */
export interface ServicioAdmin extends Servicio {
  creadoPor: Barbero | null;
  actualizadoPor: Barbero | null;
  creadoEn: string;
  actualizadoEn: string;
}

/** Las imágenes subidas vienen como "/api/imagenes/3": se resuelven contra el back. */
export function urlImagen(url: string | null): string | null {
  return url?.startsWith("/api/") ? `${BASE}${url}` : url;
}

export interface Barbero {
  id: number;
  nombre: string;
}

export interface HoraDisponible {
  inicio: string;
  barberos: Barbero[];
}

export type EstadoCita = "AGENDADA" | "CANCELADA" | "COMPLETADA" | "NO_ASISTIO";

export interface Cita {
  id: number;
  inicio: string;
  fin: string;
  estado: EstadoCita;
  canal: "WEB" | "WHATSAPP" | "PANEL";
  precio: number;
  descuentoPct: number;
  precioFinal: number;
  notas: string;
  barbero: Barbero;
  servicio: { id: number; nombre: string; duracionMin: number };
  cliente: { id: number; nombre: string; telefono: string };
}

export interface Bloqueo {
  id: number;
  barberoId: number;
  inicio: string;
  fin: string;
  motivo: string;
  barbero: Barbero;
}

export interface NuevaCita {
  servicioId: number;
  barberoId?: number;
  inicio: string;
  cliente: { nombre: string; telefono: string; aceptaDatos: boolean };
}

export type Rol = "CLIENTE" | "BARBERO" | "ADMIN";

export interface Usuario {
  rol: Rol;
  nombre: string;
  telefono: string;
  /** "YYYY-MM-DD"; siempre null para el equipo. */
  fechaNacimiento: string | null;
}

export interface SesionGuardada {
  token: string;
  usuario: Usuario;
}

/** Si la sesión vence o la cierran en el back, se avisa para limpiar la del navegador. */
export const alExpirarSesion = { manejador: () => {} };

/** Todas las respuestas del back vienen en este mismo sobre. */
interface Respuesta<T> {
  success: boolean;
  data: T;
  pagination?: { page: number; perPage: number; total: number };
  error: { code: string; message: string; details: unknown } | null;
}

/** Error del back: el código sirve para decidir, el mensaje para mostrarlo. */
export class ErrorApi extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function enviar<T>(metodo: string, ruta: string, cuerpo?: BodyInit, tipo = "application/json"): Promise<Respuesta<T>> {
  const token = almacen.sesion<SesionGuardada>()?.token;
  const res = await fetch(`${BASE}/api${ruta}`, {
    method: metodo,
    headers: { "Content-Type": tipo, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo,
  });
  const respuesta = (await res.json().catch(() => null)) as Respuesta<T> | null;
  if (res.status === 401 && token) alExpirarSesion.manejador();
  if (!respuesta?.success) {
    throw new ErrorApi(respuesta?.error?.code ?? "UNKNOWN", respuesta?.error?.message ?? `Error ${res.status}`, res.status);
  }
  return respuesta;
}

/** Pide algo y devuelve lo que viene en data */
async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const respuesta = await enviar<T>(metodo, ruta, cuerpo === undefined ? undefined : JSON.stringify(cuerpo));
  return respuesta.data;
}

const POR_PAGINA = 100;

/** Para las listas que la pantalla necesita completas: pide página por página hasta tenerlas todas */
async function pedirTodo<T>(ruta: string): Promise<T[]> {
  const separador = ruta.includes("?") ? "&" : "?";
  const todo: T[] = [];
  for (let pagina = 1; ; pagina++) {
    const respuesta = await enviar<T[]>("GET", `${ruta}${separador}page=${pagina}&perPage=${POR_PAGINA}`);
    todo.push(...respuesta.data);
    if (!respuesta.pagination || todo.length >= respuesta.pagination.total || respuesta.data.length === 0) return todo;
  }
}

export const api = {
  servicios: () => pedirTodo<Servicio>("/servicios"),
  barberos: () => pedirTodo<Barbero>("/barberos"),
  disponibilidad: (servicioId: number, fecha: string, barberoId?: number) =>
    pedirTodo<HoraDisponible>(
      `/disponibilidad?servicioId=${servicioId}&fecha=${fecha}${barberoId ? `&barberoId=${barberoId}` : ""}`,
    ),
  crearCita: (cita: NuevaCita) => pedir<Cita>("POST", "/citas", cita),
  cita: (id: number, telefono: string) => pedir<Cita>("GET", `/citas/${id}?telefono=${encodeURIComponent(telefono)}`),
  cancelarCita: (id: number, telefono: string) => pedir<Cita>("POST", `/citas/${id}/cancelar`, { telefono }),
};

export const apiCuenta = {
  login: (telefono: string, clave: string) => pedir<SesionGuardada>("POST", "/cuenta/login", { telefono, clave }),
  registro: (datos: { nombre: string; telefono: string; clave: string; fechaNacimiento?: string; aceptaDatos: true }) =>
    pedir<SesionGuardada & { descuentoPct: number }>("POST", "/cuenta/registro", datos),
  yo: () => pedir<Usuario>("GET", "/cuenta/yo"),
  guardar: (datos: { nombre: string; fechaNacimiento?: string | null }) => pedir<Usuario>("PATCH", "/cuenta/yo", datos),
  logout: () => pedir<null>("POST", "/cuenta/logout"),
  citaActiva: () => pedir<Cita | null>("GET", "/cuenta/yo/cita-activa"),
};

/** API del panel: va con la sesión del barbero o del admin. */
export function apiPanel() {
  return {
    citas: (desde: string, hasta: string) => pedirTodo<Cita>(`/panel/citas?desde=${desde}&hasta=${hasta}`),
    bloqueos: (desde: string, hasta: string) => pedirTodo<Bloqueo>(`/panel/bloqueos?desde=${desde}&hasta=${hasta}`),
    barberos: () => pedirTodo<Barbero>("/panel/barberos"),
    cambiarEstado: (id: number, estado: EstadoCita) => pedir<Cita>("PATCH", `/panel/citas/${id}/estado`, { estado }),
    crearCita: (cita: NuevaCita) => pedir<Cita>("POST", "/panel/citas", cita),
    bloquear: (b: { barberoId: number; inicio: string; fin: string; motivo: string }) => pedir("POST", "/panel/bloqueos", b),
    borrarBloqueo: (id: number) => pedir<null>("DELETE", `/panel/bloqueos/${id}`),
    servicios: () => pedirTodo<ServicioAdmin>("/panel/servicios"),
    crearServicio: (s: DatosServicio) => pedir<ServicioAdmin>("POST", "/panel/servicios", s),
    editarServicio: (id: number, s: Partial<DatosServicio>) =>
      pedir<ServicioAdmin>("PATCH", `/panel/servicios/${id}`, s),
    /** La imagen va tal cual en el cuerpo, no como JSON */
    subirImagen: async (archivo: File) => {
      try {
        const respuesta = await enviar<{ url: string }>("POST", "/panel/imagenes", archivo, archivo.type);
        return respuesta.data.url;
      } catch (e) {
        if (e instanceof ErrorApi && e.code === "PAYLOAD_TOO_LARGE") throw new Error("La imagen pesa más de 3 MB");
        throw e;
      }
    },
  };
}
