import type { ClientRepository, ClientWithHistory } from "../../../domain/repositories/ClientRepository.js";
import type { Page, PageRequest } from "../../../domain/repositories/Pagination.js";

/** Los clientes de la barbería con un resumen de sus citas, para el admin. Es solo para ver. */
export class ListClients {
  constructor(private readonly clients: ClientRepository) {}

  execute(input: { search?: string; page: PageRequest }): Promise<Page<ClientWithHistory>> {
    return this.clients.search(input.search, input.page);
  }
}
