import type { Barber } from "@/entities/barber/@x/slot";

/** Una hora libre para un servicio y los barberos que pueden atender a esa hora */
export interface Slot {
  /** "2026-10-30T10:00:00-05:00" */
  start: string;
  barbers: Barber[];
}
