/** La hora actual. Va como puerto para poder fijarla en las pruebas. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
