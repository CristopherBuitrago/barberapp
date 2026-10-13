import type { ClienteWhatsApp } from "./ClienteWhatsApp.js";

export interface ConfigMeta {
  token: string;
  phoneNumberId: string;
  graphVersion: string;
}

/** Implementación de ClienteWhatsApp sobre la WhatsApp Cloud API (Graph API de Meta). */
export class MetaWhatsAppCliente implements ClienteWhatsApp {
  private readonly url: string;

  constructor(private readonly cfg: ConfigMeta) {
    this.url = `https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`;
  }

  async enviarTexto(para: string, texto: string): Promise<void> {
    await this.post({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: para,
      type: "text",
      text: { body: texto, preview_url: false },
    });
  }

  async marcarLeidoYEscribiendo(mensajeId: string): Promise<void> {
    await this.post({
      messaging_product: "whatsapp",
      status: "read",
      message_id: mensajeId,
      typing_indicator: { type: "text" },
    });
  }

  async enviarPlantilla(
    para: string,
    plantilla: string,
    idioma: string,
    parametrosCuerpo: string[],
  ): Promise<void> {
    await this.post({
      messaging_product: "whatsapp",
      to: para,
      type: "template",
      template: {
        name: plantilla,
        language: { code: idioma },
        components: parametrosCuerpo.length
          ? [{ type: "body", parameters: parametrosCuerpo.map((text) => ({ type: "text", text })) }]
          : [],
      },
    });
  }

  private async post(cuerpo: unknown): Promise<void> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cuerpo),
    });
    if (!res.ok) {
      throw new Error(`WhatsApp API respondió ${res.status}: ${await res.text()}`);
    }
  }
}
