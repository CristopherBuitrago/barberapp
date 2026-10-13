import type Anthropic from "@anthropic-ai/sdk";

export interface Conversacion {
  mensajes: Anthropic.Beta.BetaMessageParam[];
  ultimaActividad: number;
  /** Hasta cuándo atiende una persona y el agente no responde (ms epoch). */
  humanoHasta?: number;
}

/**
 * Dónde se guardan las conversaciones. La versión en memoria sirve para un solo
 * proceso; para producción con varias instancias, implementar sobre Redis o PostgreSQL.
 */
export interface RepositorioConversaciones {
  obtener(telefono: string): Promise<Conversacion | undefined>;
  guardar(telefono: string, conversacion: Conversacion): Promise<void>;
}

export class ConversacionesEnMemoria implements RepositorioConversaciones {
  private readonly datos = new Map<string, Conversacion>();

  async obtener(telefono: string) {
    return this.datos.get(telefono);
  }

  async guardar(telefono: string, conversacion: Conversacion) {
    this.datos.set(telefono, conversacion);
  }
}
