import {
  ErrorBack,
  type BarberiaApi,
  type Barbero,
  type Cita,
  type Contacto,
  type HoraDisponible,
  type NuevaCita,
  type Servicio,
} from "./BarberiaApi.js";

/** Todas las respuestas del back vienen en este mismo sobre. */
interface Respuesta<T> {
  success: boolean;
  data: T;
  pagination?: { page: number; perPage: number; total: number };
  error: { code: string; message: string; details: unknown } | null;
}

const POR_PAGINA = 100;

export class HttpBarberiaApi implements BarberiaApi {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  servicios() {
    return this.pedirTodo<Servicio>("/api/servicios");
  }

  barberos() {
    return this.pedirTodo<Barbero>("/api/barberos");
  }

  disponibilidad(servicioId: number, fecha: string, barberoId?: number) {
    const q = new URLSearchParams({ servicioId: String(servicioId), fecha });
    if (barberoId) q.set("barberoId", String(barberoId));
    return this.pedirTodo<HoraDisponible>(`/api/disponibilidad?${q}`);
  }

  crearCita(cita: NuevaCita) {
    return this.pedir<Cita>("POST", "/api/citas", cita);
  }

  cancelarCita(citaId: number, telefono: string) {
    return this.pedir<Cita>("POST", `/api/citas/${citaId}/cancelar`, { telefono });
  }

  reprogramarCita(citaId: number, telefono: string, nuevoInicio: string) {
    return this.pedir<Cita>("POST", `/api/citas/${citaId}/reprogramar`, {
      telefono,
      inicio: nuevoInicio,
    });
  }

  contacto(telefono: string) {
    return this.pedir<Contacto>("GET", `/api/interno/contactos/${encodeURIComponent(telefono)}`);
  }

  agenda(fecha: string, barberoId?: number) {
    const q = new URLSearchParams({ fecha });
    if (barberoId) q.set("barberoId", String(barberoId));
    return this.pedirTodo<Cita>(`/api/interno/agenda?${q}`);
  }

  async bloquear(barberoId: number, inicio: string, fin: string, motivo: string) {
    await this.pedir("POST", "/api/interno/bloqueos", { barberoId, inicio, fin, motivo });
  }

  private async enviar<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<Respuesta<T>> {
    const res = await fetch(`${this.baseUrl}${ruta}`, {
      method: metodo,
      headers: { "x-api-key": this.apiKey, "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const respuesta = (await res.json().catch(() => null)) as Respuesta<T> | null;
    if (!respuesta?.success) {
      throw new ErrorBack(res.status, respuesta?.error?.code ?? "UNKNOWN", respuesta?.error?.message ?? `Error ${res.status}`);
    }
    return respuesta;
  }

  /** Devuelve lo que viene en data */
  private async pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
    return (await this.enviar<T>(metodo, ruta, cuerpo)).data;
  }

  /** Para las listas: pide página por página hasta tenerlas completas */
  private async pedirTodo<T>(ruta: string): Promise<T[]> {
    const separador = ruta.includes("?") ? "&" : "?";
    const todo: T[] = [];
    for (let pagina = 1; ; pagina++) {
      const respuesta = await this.enviar<T[]>("GET", `${ruta}${separador}page=${pagina}&perPage=${POR_PAGINA}`);
      todo.push(...respuesta.data);
      if (!respuesta.pagination || todo.length >= respuesta.pagination.total || respuesta.data.length === 0) return todo;
    }
  }
}
