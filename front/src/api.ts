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

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const token = almacen.sesion<SesionGuardada>()?.token;
  const res = await fetch(`${BASE}/api${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (res.status === 204) return undefined as T;
  const datos = await res.json().catch(() => ({}));
  if (res.status === 401 && token) alExpirarSesion.manejador();
  if (!res.ok) throw new Error(datos.error ?? `Error ${res.status}`);
  return datos as T;
}

export const api = {
  servicios: () => pedir<Servicio[]>("GET", "/servicios"),
  barberos: () => pedir<Barbero[]>("GET", "/barberos"),
  disponibilidad: (servicioId: number, fecha: string, barberoId?: number) =>
    pedir<HoraDisponible[]>(
      "GET",
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
  logout: () => pedir<void>("POST", "/cuenta/logout"),
  citaActiva: () => pedir<Cita | null>("GET", "/cuenta/yo/cita-activa"),
};

/** API del panel: va con la sesión del barbero o del admin. */
export function apiPanel() {
  return {
    citas: (desde: string, hasta: string) => pedir<Cita[]>("GET", `/panel/citas?desde=${desde}&hasta=${hasta}`),
    bloqueos: (desde: string, hasta: string) => pedir<Bloqueo[]>("GET", `/panel/bloqueos?desde=${desde}&hasta=${hasta}`),
    barberos: () => pedir<Barbero[]>("GET", "/panel/barberos"),
    cambiarEstado: (id: number, estado: EstadoCita) => pedir("PATCH", `/panel/citas/${id}/estado`, { estado }),
    crearCita: (cita: NuevaCita) => pedir<Cita>("POST", "/panel/citas", cita),
    bloquear: (b: { barberoId: number; inicio: string; fin: string; motivo: string }) => pedir("POST", "/panel/bloqueos", b),
    borrarBloqueo: (id: number) => pedir("DELETE", `/panel/bloqueos/${id}`),
    servicios: () => pedir<ServicioAdmin[]>("GET", "/panel/servicios"),
    crearServicio: (s: DatosServicio) => pedir<ServicioAdmin>("POST", "/panel/servicios", s),
    editarServicio: (id: number, s: Partial<DatosServicio>) =>
      pedir<ServicioAdmin>("PATCH", `/panel/servicios/${id}`, s),
    subirImagen: async (archivo: File) => {
      const token = almacen.sesion<SesionGuardada>()?.token;
      const res = await fetch(`${BASE}/api/panel/imagenes`, {
        method: "POST",
        headers: { "Content-Type": archivo.type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: archivo,
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(datos.error ?? (res.status === 413 ? "La imagen pesa más de 3 MB" : `Error ${res.status}`));
      return datos.url as string;
    },
  };
}
