import type { AppointmentRepository } from "../../domain/repositories/AppointmentRepository.js";
import type { BarberRepository } from "../../domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../domain/repositories/ClientRepository.js";
import type { TimeBlockRepository } from "../../domain/repositories/TimeBlockRepository.js";

/** Los repositorios que se pueden usar dentro de una transacción. */
export interface TransactionalRepositories {
  appointments: AppointmentRepository;
  barbers: BarberRepository;
  clients: ClientRepository;
  timeBlocks: TimeBlockRepository;
}

/**
 * Corre el trabajo en una transacción serializable. Así dos reservas al mismo tiempo
 * no pueden quedarse con la misma hora. Si la base la aborta por un choque, la reintenta.
 */
export interface TransactionRunner {
  run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T>;
}
