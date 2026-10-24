import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../../domain/repositories/ClientRepository.js";
import type { Profile, UpdateProfileInput } from "../../dtos/accounts.js";
import { profileOf, toBirthDate } from "./profile.js";

/** Edita el perfil. El teléfono no se cambia porque es con lo que se inicia sesión. */
export class UpdateProfile {
  constructor(
    private readonly clients: ClientRepository,
    private readonly barbers: BarberRepository,
  ) {}

  async execute(input: UpdateProfileInput): Promise<Profile> {
    const { client, barber } = input.session;
    if (client) {
      client.name = input.name;
      if (input.birthDate !== undefined) client.birthDate = input.birthDate ? toBirthDate(input.birthDate) : null;
      return profileOf(await this.clients.save(client));
    }
    barber!.name = input.name;
    return profileOf(await this.barbers.save(barber!));
  }
}
