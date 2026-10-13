/** Puerto hacia el back de la barbería. Implementación HTTP en HttpBarberiaApi. */

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precio: number;
}

export interface Barbero {
  id: number;
  nombre: string;
}

export interface HoraDisponible {
  inicio: string;
  barberos: Barbero[];
}

export interface Cita {
  id: number;
  inicio: string;
  fin: string;
  estado: string;
  precio: number;
  descuentoPct: number;
  precioFinal: number;
  barbero: Barbero;
  servicio: { id: number; nombre: string; duracionMin: number };
  cliente: { id: number; nombre: string; telefono: string };
}

export type Contacto =
  | { tipo: "barbero"; barbero: Barbero }
  | {
      tipo: "cliente";
      cliente: { nombre: string; registrado: boolean; descuentoPendientePct: number } | null;
      citasProximas: Cita[];
    };

export interface NuevaCita {
  servicioId: number;
  barberoId?: number;
  inicio: string;
  cliente: { nombre: string; telefono: string; aceptaDatos: boolean };
}

/** Error del back con mensaje legible (ej. "Esa hora ya no está disponible"). */
export class ErrorBack extends Error {
  constructor(
    public readonly status: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export interface BarberiaApi {
  servicios(): Promise<Servicio[]>;
  barberos(): Promise<Barbero[]>;
  disponibilidad(servicioId: number, fecha: string, barberoId?: number): Promise<HoraDisponible[]>;
  crearCita(cita: NuevaCita): Promise<Cita>;
  cancelarCita(citaId: number, telefono: string): Promise<Cita>;
  reprogramarCita(citaId: number, telefono: string, nuevoInicio: string): Promise<Cita>;
  contacto(telefono: string): Promise<Contacto>;
  agenda(fecha: string, barberoId?: number): Promise<Cita[]>;
  bloquear(barberoId: number, inicio: string, fin: string, motivo: string): Promise<void>;
}
