import { Prisma, type PrismaClient } from "@prisma/client";
import type { TransactionalRepositories, TransactionRunner } from "../../../application/ports/TransactionRunner.js";
import { PrismaAppointmentRepository } from "./PrismaAppointmentRepository.js";
import { PrismaBarberRepository } from "./PrismaBarberRepository.js";
import { PrismaClientRepository } from "./PrismaClientRepository.js";
import { PrismaTimeBlockRepository } from "./PrismaTimeBlockRepository.js";

const MAX_RETRIES = 2;

/**
 * Transacción serializable de PostgreSQL. Si dos reservas chocan, la base aborta una
 * con el código P2034 y aquí se vuelve a intentar.
 */
export class PrismaTransactionRunner implements TransactionRunner {
  constructor(private readonly prisma: PrismaClient) {}

  async run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          (tx) =>
            work({
              appointments: new PrismaAppointmentRepository(tx),
              barbers: new PrismaBarberRepository(tx),
              clients: new PrismaClientRepository(tx),
              timeBlocks: new PrismaTimeBlockRepository(tx),
            }),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const clash = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
        if (!clash || attempt >= MAX_RETRIES) throw error;
      }
    }
  }
}
