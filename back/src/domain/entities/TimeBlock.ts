import type { BarberSummary } from "./Barber.js";

/** Rato en que un barbero no atiende: almuerzo, una diligencia, un día libre. */
export interface TimeBlock {
  id: number;
  barberId: number;
  start: Date;
  end: Date;
  reason: string;
}

export interface TimeBlockWithBarber extends TimeBlock {
  barber: BarberSummary;
}
