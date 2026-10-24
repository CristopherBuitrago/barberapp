import { ErrorCode } from "../../../domain/errors/ErrorCode.js";
import { ConflictError } from "../../../domain/errors/DomainError.js";
import type { BarberRepository } from "../../../domain/repositories/BarberRepository.js";
import type { ClientRepository } from "../../../domain/repositories/ClientRepository.js";

/**
 * Dos barberos no se pueden llamar igual (el script de cuentas los busca por nombre) ni
 * tener el mismo teléfono, que es con el que entran y con el que los reconoce el agente.
 * Tampoco puede ser el teléfono de un cliente con cuenta, porque el login no sabría a cuál entrar
 */
export async function ensureFreeNameAndPhone(
  barbers: BarberRepository,
  clients: ClientRepository,
  name: string | undefined,
  phone: string | null | undefined,
  exceptId?: number,
): Promise<void> {
  if (name !== undefined && (await barbers.existsWithName(name, exceptId))) {
    throw new ConflictError(`Ya hay un barbero llamado "${name}"`, ErrorCode.BarberNameTaken);
  }
  if (!phone) return;
  const taken =
    (await barbers.existsWithPhone(phone, exceptId)) || !!(await clients.findByPhone(phone))?.hasAccount;
  if (taken) throw new ConflictError("Ese teléfono ya lo tiene otra cuenta", ErrorCode.PhoneAlreadyRegistered);
}
