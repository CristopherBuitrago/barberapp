/** Cliente de la barbería. Se crea la primera vez que reserva, tenga cuenta o no. */
export interface Client {
  id: number;
  name: string;
  phone: string;
  birthDate: Date | null;
  /** Si creó cuenta en la web */
  registered: boolean;
  /** Si aceptó el tratamiento de datos (Ley 1581) */
  acceptsDataPolicy: boolean;
  welcomeDiscountUsed: boolean;
  /** Null si solo ha reservado sin cuenta */
  passwordHash: string | null;
  createdAt: Date;
}

/** El descuento de bienvenida aplica una sola vez, en la primera cita después de registrarse. */
export function hasPendingWelcomeDiscount(client: Client): boolean {
  return client.registered && !client.welcomeDiscountUsed;
}
