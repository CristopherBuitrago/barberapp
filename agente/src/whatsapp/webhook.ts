import { createHmac, timingSafeEqual } from "node:crypto";
import express, { Router, type Request } from "express";
import type { MensajeCliente, MensajeEntrante, PayloadWebhook } from "./tipos.js";

interface OpcionesWebhook {
  verifyToken: string;
  appSecret: string;
  alRecibir: (mensaje: MensajeCliente) => void;
}

type RequestConCuerpoCrudo = Request & { cuerpoCrudo?: Buffer };

/** Verifica X-Hub-Signature-256 = HMAC-SHA256(cuerpo crudo, clave secreta de la app). */
function firmaValida(cuerpo: Buffer | undefined, firma: string | undefined, secreto: string): boolean {
  if (!cuerpo || !firma?.startsWith("sha256=")) return false;
  const esperada = Buffer.from(createHmac("sha256", secreto).update(cuerpo).digest("hex"));
  const recibida = Buffer.from(firma.slice("sha256=".length));
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

/** Convierte cualquier tipo de mensaje en texto que el agente pueda entender. */
function textoDe(m: MensajeEntrante): string {
  switch (m.type) {
    case "text":
      return m.text?.body ?? "";
    case "button":
      return m.button?.text ?? "";
    case "interactive":
      return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
    case "audio":
      return "[El cliente mandó una nota de voz. No la puedes escuchar.]";
    case "image":
    case "video":
    case "sticker":
      return `[El cliente mandó un ${m.type}. No lo puedes ver.]`;
    case "location":
      return "[El cliente mandó una ubicación.]";
    default:
      return `[El cliente mandó un mensaje de tipo ${m.type}.]`;
  }
}

/**
 * Webhook de WhatsApp Cloud API.
 * - GET: verificación del endpoint al configurarlo en Meta for Developers.
 * - POST: mensajes entrantes. Responde 200 de inmediato y procesa en segundo plano,
 *   porque Meta reintenta si no recibe respuesta rápida.
 */
export function crearWebhookWhatsApp(opciones: OpcionesWebhook): Router {
  const router = Router();
  const yaVistos = new Set<string>();

  router.get("/", (req, res) => {
    const modo = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const reto = req.query["hub.challenge"];
    if (modo === "subscribe" && token === opciones.verifyToken) {
      res.status(200).send(String(reto));
      return;
    }
    res.sendStatus(403);
  });

  router.post(
    "/",
    express.json({
      verify: (req, _res, buf) => {
        (req as RequestConCuerpoCrudo).cuerpoCrudo = Buffer.from(buf);
      },
    }),
    (req, res) => {
      const crudo = (req as RequestConCuerpoCrudo).cuerpoCrudo;
      if (!firmaValida(crudo, req.header("x-hub-signature-256"), opciones.appSecret)) {
        res.sendStatus(401);
        return;
      }
      res.sendStatus(200);

      const payload = req.body as PayloadWebhook;
      for (const entrada of payload.entry ?? []) {
        for (const cambio of entrada.changes ?? []) {
          const valor = cambio.value;
          for (const m of valor.messages ?? []) {
            // Meta puede reenviar el mismo mensaje; se procesa una sola vez.
            if (yaVistos.has(m.id)) continue;
            yaVistos.add(m.id);
            if (yaVistos.size > 5000) yaVistos.delete(yaVistos.values().next().value!);

            const contacto = valor.contacts?.find((c) => c.wa_id === m.from);
            opciones.alRecibir({
              id: m.id,
              telefono: m.from,
              nombrePerfil: contacto?.profile?.name,
              texto: textoDe(m),
            });
          }
        }
      }
    },
  );

  return router;
}
