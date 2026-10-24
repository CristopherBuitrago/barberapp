import type { Barber } from "@/entities/barber/@x/time-block";

/** Rato en que un barbero no atiende: almuerzo, una diligencia, un día libre */
export interface TimeBlock {
  id: number;
  start: string;
  end: string;
  reason: string;
  barber: Barber;
}
