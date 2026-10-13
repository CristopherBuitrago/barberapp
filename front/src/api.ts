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

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...headers },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (res.status === 204) return undefined as T;
  const datos = await res.json().catch(() => ({}));
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
  cancelarCita: (id: number, telefono: string) => pedir<Cita>("POST", `/citas/${id}/cancelar`, { telefono }),
  registro: (datos: { nombre: string; telefono: string; fechaNacimiento?: string; aceptaDatos: true }) =>
    pedir<{ nombre: string; descuentoPct: number }>("POST", "/clientes/registro", datos),
};

/** API del panel: todas las llamadas llevan la clave en x-panel-clave. */
export function apiPanel(clave: string) {
  const h = { "x-panel-clave": clave };
  return {
    verificar: () => pedir<{ ok: true }>("GET", "/panel/verificar", undefined, h),
    citas: (desde: string, hasta: string) => pedir<Cita[]>("GET", `/panel/citas?desde=${desde}&hasta=${hasta}`, undefined, h),
    bloqueos: (desde: string, hasta: string) => pedir<Bloqueo[]>("GET", `/panel/bloqueos?desde=${desde}&hasta=${hasta}`, undefined, h),
    barberos: () => pedir<Barbero[]>("GET", "/panel/barberos", undefined, h),
    cambiarEstado: (id: number, estado: EstadoCita) => pedir("PATCH", `/panel/citas/${id}/estado`, { estado }, h),
    crearCita: (cita: NuevaCita) => pedir<Cita>("POST", "/panel/citas", cita, h),
    bloquear: (b: { barberoId: number; inicio: string; fin: string; motivo: string }) => pedir("POST", "/panel/bloqueos", b, h),
    borrarBloqueo: (id: number) => pedir("DELETE", `/panel/bloqueos/${id}`, undefined, h),
  };
}
