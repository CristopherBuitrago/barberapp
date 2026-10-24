/**
 * Clases de Tailwind que se repiten. Son funciones y no componentes porque se usan igual
 * en <button>, <Link>, <a> y <label>.
 *
 * Hay dos familias: "site" es la web del cliente (diseño de Figma, medidas pequeñas que se
 * escalan con --db-scale) y "panel" es el panel de la barbería.
 */
import { cn } from "../lib/cn";

// --- Web del cliente ---

export type SiteButtonVariant = "primary" | "danger" | "success" | "booked" | "whatsapp";

const SITE_BUTTON_BG: Record<SiteButtonVariant, string> = {
  primary: "bg-db-blue",
  danger: "bg-db-red",
  success: "bg-db-green",
  booked: "bg-db-orange",
  whatsapp: "bg-whatsapp",
};

/** Botón del diseño: 17 px de alto y esquinas de 5 px. Desactivado se pone gris */
export function siteButton(variant: SiteButtonVariant, options: { disabledBg?: string; extra?: string } = {}): string {
  return cn(
    "inline-block min-w-[67px] h-[17px] cursor-pointer rounded-[5px] border-0 px-[9px] py-0 text-center text-[11px] leading-[17px] font-bold text-white no-underline [font-family:inherit]",
    "disabled:cursor-not-allowed",
    SITE_BUTTON_BG[variant],
    options.disabledBg ?? "disabled:bg-db-gray-button",
    options.extra,
  );
}

/** Botón de ancho completo de los formularios de perfil */
export const siteWideButton = "block! w-full! h-[22px]! leading-[22px]!";

export const siteCard =
  "bg-white border border-solid border-db-card-border rounded-[10px] shadow-[0_0_5px_rgb(0_0_0/25%)] px-[14px] pt-[13px] pb-[11px]";

/** La tarjeta grande de los pasos de la reserva y de la confirmación */
export const siteStepCard = cn(siteCard, "px-[7px]! pt-2! pb-4! w-full max-w-[480px] mx-auto");

export const siteText = {
  title: "text-[12px] font-bold text-black",
  section: "text-[10px] font-bold text-db-text-soft mt-[14px] mr-0 mb-[6px] ml-[3px]",
  description: "text-[10px] font-bold text-db-text-soft leading-[normal] mt-[11px] mb-[22px] mx-0",
  error: "text-[10px] font-bold text-db-red mt-[10px] mb-0 mx-0",
  loading: "text-[10px] font-bold text-db-text-soft text-center my-3 mx-0",
  link: "bg-transparent border-0 p-0 cursor-pointer underline [font-family:inherit] text-[10px] font-bold text-db-text",
  checkbox: "flex items-start gap-[6px] text-[9px] font-medium text-db-text-soft mt-3 leading-[1.4]",
};

/** Recuadros dentro de la tarjeta grande (servicio, resumen, contacto) */
export const siteBox = "border border-solid border-db-box-border rounded-[5px] bg-white mt-[19px] [&+&]:mt-3";
export const siteBoxHeader =
  "flex justify-between items-center pt-[5px] pr-[5px] pb-[5px] pl-[9px] border-0 border-b border-solid border-db-box-border min-h-[28px]";
export const siteBoxBody = "pt-[6px] pr-[7px] pb-[10px] pl-[6px]";
/** El cuerpo cuando va debajo de una cabecera */
export const siteBoxBodyAfterHeader = "pt-[13px] pr-[9px] pb-[10px] pl-[12px]";

// --- Panel de la barbería ---

export type PanelButtonVariant = "primary" | "success" | "danger" | "secondary";

const PANEL_BUTTON_VARIANT: Record<PanelButtonVariant, string> = {
  primary: "bg-brand text-white border-0",
  success: "bg-ok text-white border-0",
  danger: "bg-danger text-white border-0",
  secondary: "bg-white text-ink border border-solid border-line",
};

/**
 * md es el de las barras del panel y sm el de las tablas. wide es de ancho completo,
 * como el "Guardar" de los formularios
 */
export function panelButton(
  variant: PanelButtonVariant,
  size: "lg" | "md" | "sm" = "lg",
  extra?: string,
  wide = false,
): string {
  return cn(
    "cursor-pointer rounded-full text-center font-semibold no-underline [font-family:inherit]",
    wide ? "block w-full" : "inline-block",
    "disabled:cursor-not-allowed disabled:opacity-45",
    size === "lg" && "px-5 py-[10px] text-[0.9rem]",
    size === "md" && "px-[14px] py-2 text-[0.9rem]",
    size === "sm" && "px-3 py-[5px] text-[0.82rem]",
    PANEL_BUTTON_VARIANT[variant],
    extra,
  );
}

export const panelCard = "bg-card rounded-card p-4 shadow-[0_1px_3px_rgb(0_0_0/8%)]";
export const panelControl =
  "border border-solid border-line rounded-[10px] px-3 py-[10px] text-[0.95rem] [font-family:inherit] text-ink bg-white";
export const panelLink =
  "bg-transparent border-0 p-0 cursor-pointer underline [font-family:inherit] text-[0.9rem] text-inherit";

export const panelText = {
  error: "text-danger text-[0.85rem] mt-[10px] mb-0 mx-0",
  loading: "text-muted text-center",
  checkbox: "flex gap-[10px] items-start text-[0.8rem] text-muted mt-[14px] leading-[1.4]",
};

/** La tarjeta de los formularios de perfil (Figma "iPhone 16 - 7/8/9") */
export const profileCard = cn(
  siteCard,
  "flex! flex-col min-h-[353px] pt-[21px]! pr-[15px]! pb-[17px]! pl-[17px]! w-full max-w-[480px] mx-auto",
);
export const profileTitle = "text-[24px] font-bold text-db-text mt-0 mx-[6px] mb-[22px] max-w-[230px] leading-[normal]";

/** Fila de botones al final de una tarjeta */
export const siteActions = "flex justify-between items-center gap-[10px] mt-[18px]";
