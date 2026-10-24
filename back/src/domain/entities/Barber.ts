/** Alguien del equipo de la barbería. Si tiene contraseña puede entrar al panel. */
export interface Barber {
  id: number;
  name: string;
  /** WhatsApp con indicativo y sin "+", por ejemplo 573001234567 */
  phone: string | null;
  active: boolean;
  passwordHash: string | null;
  isAdmin: boolean;
}

/** Jornada de un barbero en un día de la semana (0 es domingo, 6 es sábado). */
export interface WorkSchedule {
  id: number;
  barberId: number;
  weekday: number;
  /** Hora local, por ejemplo "09:00" */
  startTime: string;
  endTime: string;
}

export interface BarberWithSchedules extends Barber {
  schedules: WorkSchedule[];
}

/** Lo mínimo de un barbero que se muestra en citas y listas. */
export interface BarberSummary {
  id: number;
  name: string;
}
