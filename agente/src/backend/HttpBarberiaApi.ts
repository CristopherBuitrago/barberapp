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

export class HttpBarberiaApi implements BarberiaApi {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  servicios() {
    return this.pedir<Servicio[]>("GET", "/api/servicios");
  }

  barberos() {
    return this.pedir<Barbero[]>("GET", "/api/barberos");
  }

  disponibilidad(servicioId: number, fecha: string, barberoId?: number) {
    const q = new URLSearchParams({ servicioId: String(servicioId), fecha });
    if (barberoId) q.set("barberoId", String(barberoId));
    return this.pedir<HoraDisponible[]>("GET", `/api/disponibilidad?${q}`);
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
    return this.pedir<Cita[]>("GET", `/api/interno/agenda?${q}`);
  }

  async bloquear(barberoId: number, inicio: string, fin: string, motivo: string) {
    await this.pedir("POST", "/api/interno/bloqueos", { barberoId, inicio, fin, motivo });
  }

  private async pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${ruta}`, {
      method: metodo,
      headers: { "x-api-key": this.apiKey, "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const datos = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new ErrorBack(res.status, datos.error ?? `Error ${res.status}`);
    return datos as T;
  }
}
