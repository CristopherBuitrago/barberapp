/**
 * Puerto de salida hacia WhatsApp. El agente solo conoce esta interfaz; la
 * implementación con la Cloud API de Meta está en MetaWhatsAppCliente.
 */
export interface ClienteWhatsApp {
  /** Mensaje de texto libre. Solo se entrega dentro de la ventana de 24 h del cliente. */
  enviarTexto(para: string, texto: string): Promise<void>;

  /** Marca el mensaje como leído (palomitas azules) y muestra "escribiendo...". */
  marcarLeidoYEscribiendo(mensajeId: string): Promise<void>;

  /**
   * Plantilla aprobada en Meta. Es la única forma de escribirle primero a alguien
   * fuera de la ventana de 24 h (recordatorios, avisos a la barbería).
   */
  enviarPlantilla(
    para: string,
    plantilla: string,
    idioma: string,
    parametrosCuerpo: string[],
  ): Promise<void>;
}
