export interface Barber {
  id: number;
  name: string;
}

/** Jornada de un barbero (0 es domingo) */
export interface WorkSchedule {
  id: number;
  weekday: number;
  /** "09:00" */
  startTime: string;
  endTime: string;
}

/** Alguien del equipo como lo ve el panel */
export interface TeamMember extends Barber {
  phone: string | null;
  active: boolean;
  isAdmin: boolean;
  schedules: WorkSchedule[];
}
