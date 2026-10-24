/** Una jornada como la manda el panel: día de la semana (0 es domingo) y horas locales */
export interface ScheduleInput {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface CreateBarberInput {
  name: string;
  phone: string | null;
  /** La semana completa, el día que no venga no trabaja */
  schedules: ScheduleInput[];
}

export interface UpdateBarberInput {
  barberId: number;
  /** Solo se cambia lo que venga */
  name?: string;
  phone?: string | null;
  active?: boolean;
  schedules?: ScheduleInput[];
}
