import { Barber } from "../../../domain/entities/Barber.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../../domain/repositories/ClientRepository.js";
import type { CreateBarberInput } from "../../dtos/barbers.js";
import type { TransactionRunner } from "../../ports/TransactionRunner.js";
import { ensureFreeNameAndPhone } from "./teamRules.js";

/** El admin agrega un barbero con su semana. Entra sin cuenta del panel, esa se le da aparte. */
export class CreateBarber {
  constructor(
    private readonly barbers: BarberRepository,
    private readonly clients: ClientRepository,
    private readonly transactions: TransactionRunner,
  ) {}

  async execute(input: CreateBarberInput): Promise<Barber> {
    // Se arma antes de mirar la base, así los datos malos fallan con su mensaje
    const draft = Barber.create({ name: input.name, phone: input.phone });
    await ensureFreeNameAndPhone(this.barbers, this.clients, draft.name, draft.phone);
    // Las jornadas necesitan el id, por eso se guarda dos veces y todo en una transacción
    return this.transactions.run(async (repos) => {
      const barber = await repos.barbers.save(draft);
      barber.replaceSchedules(input.schedules);
      return repos.barbers.save(barber);
    });
  }
}
