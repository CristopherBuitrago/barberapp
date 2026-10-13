import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { ErrorBack, type BarberiaApi, type Contacto } from "../backend/BarberiaApi.js";
import type { Conversacion, RepositorioConversaciones } from "../conversaciones/RepositorioConversaciones.js";
import type { ClienteWhatsApp } from "../whatsapp/ClienteWhatsApp.js";
import { ahoraEnTexto, describirInicio } from "./fechas.js";
import { herramientasBarbero, herramientasCliente } from "./herramientas.js";
import { PROMPT_BARBERO, PROMPT_CLIENTE, SEPARADOR_MENSAJES } from "./prompt.js";

const MAX_VUELTAS = 8;
const MAX_MENSAJES_POR_CONVERSACION = 120;
const HORAS_ATENCION_HUMANA = 2;
const MENSAJE_ERROR = "Uy, se me trabó el celular 😅 ¿me repites porfa?";

interface Dependencias {
  claude: Anthropic;
  api: BarberiaApi;
  whatsapp: ClienteWhatsApp;
  conversaciones: RepositorioConversaciones;
}

/** Contexto del cliente que se le da al modelo al iniciar cada conversación. */
function notaInicial(contacto: Contacto, nombrePerfil?: string): string {
  if (contacto.tipo === "barbero") return `[Te escribe ${contacto.barbero.nombre}, barbero del equipo.]`;
  const partes: string[] = [];
  if (contacto.cliente) {
    partes.push(`Cliente conocido: ${contacto.cliente.nombre}.`);
    partes.push(contacto.cliente.registrado ? "Registrado en la plataforma." : "No registrado en la plataforma.");
    if (contacto.cliente.descuentoPendientePct) {
      partes.push(`Tiene ${contacto.cliente.descuentoPendientePct}% de descuento pendiente en su próxima cita (se aplica solo).`);
    }
  } else {
    partes.push(`Cliente nuevo${nombrePerfil ? `; en WhatsApp aparece como "${nombrePerfil}" (confirma su nombre antes de agendar)` : ""}.`);
  }
  if (contacto.citasProximas.length) {
    const citas = contacto.citasProximas
      .map((c) => `#${c.id} ${describirInicio(c.inicio)} ${c.servicio.nombre} con ${c.barbero.nombre}`)
      .join("; ");
    partes.push(`Citas próximas: ${citas}.`);
  }
  return `[${partes.join(" ")}]`;
}

export class AgenteBarberia {
  constructor(private readonly deps: Dependencias) {}

  /**
   * Procesa un mensaje entrante y devuelve los mensajes a enviar (vacío si una
   * persona está atendiendo la conversación).
   */
  async responder(telefono: string, texto: string, nombrePerfil?: string): Promise<string[]> {
    const { api, conversaciones } = this.deps;
    const ahora = Date.now();

    let conv = await conversaciones.obtener(telefono);
    if (conv?.humanoHasta && conv.humanoHasta > ahora) return [];

    const vencida =
      !conv ||
      ahora - conv.ultimaActividad > config.horasSesion * 60 * 60 * 1000 ||
      conv.mensajes.length > MAX_MENSAJES_POR_CONVERSACION;

    const contacto = await api.contacto(telefono);
    let entrada = `[${ahoraEnTexto()}]\n${texto}`;
    if (vencida) {
      conv = { mensajes: [], ultimaActividad: ahora };
      entrada = `${notaInicial(contacto, nombrePerfil)}\n${entrada}`;
    }
    const conversacion = conv!;
    conversacion.ultimaActividad = ahora;
    conversacion.mensajes.push({ role: "user", content: entrada });

    try {
      const respuesta = await this.ejecutarVueltas(conversacion, contacto, telefono);
      return respuesta
        .split(SEPARADOR_MENSAJES)
        .map((m) => m.trim())
        .filter(Boolean)
        .slice(0, 3);
    } catch (e) {
      console.error(`Error atendiendo a ${telefono}:`, e);
      return [MENSAJE_ERROR];
    } finally {
      await conversaciones.guardar(telefono, conversacion);
    }
  }

  private async ejecutarVueltas(conv: Conversacion, contacto: Contacto, telefono: string): Promise<string> {
    const { claude, api } = this.deps;
    const esBarbero = contacto.tipo === "barbero";
    const herramientas = esBarbero
      ? herramientasBarbero(api, contacto.barbero.id)
      : herramientasCliente({
          api,
          telefono,
          pasarAHumano: (motivo) => this.pasarAHumano(conv, telefono, motivo),
        });
    const porNombre = new Map(herramientas.map((h) => [h.definicion.name, h]));

    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      const mensaje = await claude.beta.messages.create({
        model: config.claude.modelo,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: config.claude.esfuerzo },
        system: [
          {
            type: "text",
            text: esBarbero ? PROMPT_BARBERO : PROMPT_CLIENTE,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: herramientas.map((h) => h.definicion),
        messages: conv.mensajes,
      });

      // Historial solo-agregar: se guarda el contenido completo (incluye bloques de razonamiento).
      conv.mensajes.push({ role: "assistant", content: mensaje.content });

      if (mensaje.stop_reason === "refusal") {
        return "Uy, eso sí no te lo sé responder por aquí. ¿Te ayudo con alguna cita? 💈";
      }
      if (mensaje.stop_reason === "pause_turn") continue;

      const usos = mensaje.content.filter(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
      );
      if (mensaje.stop_reason !== "tool_use" || usos.length === 0) {
        return mensaje.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");
      }

      const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = await Promise.all(
        usos.map(async (uso) => {
          const h = porNombre.get(uso.name);
          try {
            if (!h) throw new Error(`Herramienta desconocida: ${uso.name}`);
            return { type: "tool_result" as const, tool_use_id: uso.id, content: await h.ejecutar(uso.input) };
          } catch (e) {
            const detalle = e instanceof ErrorBack || e instanceof Error ? e.message : String(e);
            return { type: "tool_result" as const, tool_use_id: uso.id, is_error: true, content: detalle };
          }
        }),
      );
      conv.mensajes.push({ role: "user", content: resultados });
    }
    throw new Error("El agente superó el máximo de vueltas");
  }

  private async pasarAHumano(conv: Conversacion, telefono: string, motivo: string) {
    conv.humanoHasta = Date.now() + HORAS_ATENCION_HUMANA * 60 * 60 * 1000;
    const destino = config.barberia.telefonoAvisos;
    if (!destino) return;
    try {
      await this.deps.whatsapp.enviarTexto(
        destino,
        `🔔 El cliente +${telefono} necesita que alguien le escriba: ${motivo}`,
      );
    } catch (e) {
      // Fuera de la ventana de 24 h Meta exige plantilla; ver README (plantilla "aviso_equipo").
      console.error("No se pudo avisar al equipo:", e);
    }
  }
}
