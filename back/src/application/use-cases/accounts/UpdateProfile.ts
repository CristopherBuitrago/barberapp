import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../../domain/repositories/ClientRepository.js";
import type { Profile, UpdateProfileInput } from "../../dtos/accounts.js";
import { clientProfile, teamProfile, toBirthDate } from "./profile.js";

/** Edita el perfil. El teléfono no se cambia porque es con lo que se inicia sesión. */
export class UpdateProfile {
  constructor(
    private readonly clients: ClientRepository,
    private readonly barbers: BarberRepository,
  ) {}

  async execute(input: UpdateProfileInput): Promise<Profile> {
    const { session } = input;
    if (session.role === "CLIENTE") {
      const birthDate =
        input.birthDate === undefined ? undefined : input.birthDate === null ? null : toBirthDate(input.birthDate);
      return clientProfile(await this.clients.updateProfile(session.client.id, { name: input.name, birthDate }));
    }
    return teamProfile(await this.barbers.updateName(session.barber.id, input.name));
  }
}
